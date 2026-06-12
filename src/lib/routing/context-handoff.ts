// ============================================================================
// Context Handoff
// ============================================================================
// When the router switches models mid-conversation (failover or alias change),
// this module injects a system message summarising the conversation context so
// the new model does not hallucinate prior exchanges.
//
// Detects model-family changes (e.g. Gemini -> Llama) and summarises the last
// N user/assistant turns to bridge the gap.
// ============================================================================

// Reuse the NormalizedChatRequest message type
import type { Message } from "@/lib/providers/contract";

// ============================================================================
// Types
// ============================================================================

export interface HandoffOptions {
  /** Max number of recent user/assistant turns to summarise (default 4 turns) */
  summaryTurns?: number;
  /** Whether to include the very last assistant message in the summary (default true) */
  includeLastAssistant?: boolean;
}

const DEFAULT_HANDOFF_OPTIONS: Required<HandoffOptions> = {
  summaryTurns: 4,
  includeLastAssistant: true,
};

// ============================================================================
// Model Family Detection
// ============================================================================

/**
 * Attempt to detect if the conversation is switching between model families.
 * Uses message metadata or model field if present.
 */
function detectFamilyChange(
  messages: Message[],
  _newModelFamily?: string
): { changed: boolean; fromFamily: string; toFamily?: string } {
  if (messages.length === 0) return { changed: false, fromFamily: "unknown" };

  // Check if any message has model metadata indicating a previous model
  let lastModelFamily = "unknown";
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.modelFamily) {
      lastModelFamily = msg.modelFamily;
      break;
    }
    // Try to infer from content patterns (less reliable)
    if (msg.role === "assistant" && typeof msg.content === "string") {
      // Check for model-specific signatures (very rough heuristic)
      lastModelFamily = "unknown";
    }
  }

  const newFamily = _newModelFamily ?? "unknown";
  const changed = lastModelFamily !== "unknown" && newFamily !== "unknown" && lastModelFamily !== newFamily;

  return { changed, fromFamily: lastModelFamily, toFamily: newFamily };
}

// ============================================================================
// Summary Builder
// ============================================================================

/**
 * Build a concise summary of recent conversation turns.
 * Caps each turn at a reasonable length to avoid blowing the context window.
 */
function summarizeTurns(messages: Message[], maxTurns: number): string {
  // Collect user/assistant pairs, skip system messages
  const turns: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === "system") continue;
    if (msg.role !== "user" && msg.role !== "assistant") continue;

    const content = extractTextContent(msg.content);
    if (!content || content.trim().length === 0) continue;

    turns.push({ role: msg.role, content });
  }

  // Take the last N turns
  const recent = turns.slice(-maxTurns * 2); // *2 because each turn = user + assistant

  const lines: string[] = [];
  for (const turn of recent) {
    // Truncate long messages to keep summary concise
    const truncated = truncateText(turn.content, 300);
    const label = turn.role === "user" ? "User" : "Assistant";
    lines.push(`${label}: ${truncated}`);
  }

  return lines.join("\n");
}

/**
 * Extract text from a message content field which may be a string or
 * an array of content parts.
 */
function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return (part as Record<string, unknown>).text as string ?? "";
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + "...";
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Build a context-handoff-aware message list.
 *
 * If the model family has changed, prepends a system message summarising the
 * conversation history so the new model has continuity.
 *
 * @param messages  The original conversation messages
 * @param options   Handoff configuration
 * @returns         A new message array (or the original if no change detected)
 */
export function buildContextHandoff(
  messages: Message[],
  options?: HandoffOptions
): Message[] {
  const opts = { ...DEFAULT_HANDOFF_OPTIONS, ...options };

  if (messages.length === 0) return messages;

  // Detect if family changed — we can check by looking for modelFamily metadata
  // on messages; if the last assistant message's family differs from what we're
  // switching to, we need a handoff.
  const detection = detectFamilyChange(messages);

  if (!detection.changed && messages.length <= opts.summaryTurns * 2) {
    // Short conversation or same family — no handoff needed
    return messages;
  }

  // Check if there's already a handoff message to avoid double-injection
  const hasExistingHandoff = messages.some(
    (msg) =>
      msg.role === "system" &&
      typeof msg.content === "string" &&
      msg.content.startsWith("[Conversation handoff]")
  );

  if (hasExistingHandoff) {
    return messages;
  }

  // Build summary
  const summary = summarizeTurns(messages, opts.summaryTurns);
  const fromLabel = detection.fromFamily !== "unknown" ? detection.fromFamily : "previous model";

  const handoffSystemMessage: Message = {
    role: "system",
    content: buildHandoffSummary(detection, summary),
    modelFamily: "system",
  };

  // Find the index of the first system message, or insert at beginning
  const firstSystemIdx = messages.findIndex((m) => m.role === "system");

  if (firstSystemIdx === -1) {
    // No system message exists — prepend
    return [handoffSystemMessage, ...messages];
  } else {
    // Insert after existing system messages
    const result = [...messages];
    // Find the last system message
    let lastSystemIdx = firstSystemIdx;
    for (let i = firstSystemIdx; i < messages.length; i++) {
      if (messages[i].role === "system") lastSystemIdx = i;
    }
    result.splice(lastSystemIdx + 1, 0, handoffSystemMessage);
    return result;
  }
}

/**
 * Build the actual handoff summary text.
 */
function buildHandoffSummary(
  detection: { changed: boolean; fromFamily: string; toFamily?: string },
  conversationSummary: string
): string {
  const parts: string[] = [];

  parts.push("[Conversation handoff]");

  if (detection.changed) {
    parts.push(
      `This conversation was previously handled by ${detection.fromFamily} and is now being handled by ${detection.toFamily ?? "another model"}.`
    );
  }

  parts.push(
    "Below is a summary of the recent conversation context to maintain continuity:"
  );

  parts.push("---");
  parts.push(conversationSummary);
  parts.push("---");

  if (detection.changed) {
    parts.push(
      "Please continue the conversation naturally, maintaining the assistant's previous tone and knowledge of the conversation."
    );
  }

  return parts.join("\n");
}

// ============================================================================
// Overload for typed arrays
// ============================================================================

// If Message type from contract doesn't support modelFamily, add it via declaration merging
// This is a helper to add modelFamily support:
declare module "@/lib/providers/contract" {
  interface Message {
    modelFamily?: string;
  }
}
