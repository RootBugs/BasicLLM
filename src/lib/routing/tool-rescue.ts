// ============================================================================
// Tool Call Rescue
// ============================================================================
// Handles inline tool-call dialects from different models. Different providers
// and models emit tool calls in wildly different formats. This module attempts
// to parse them all into a unified ToolCall[] structure.
//
// Supported dialects:
//   1. Kimi/DeepSeek token format: <|tool_call_begin|>...<|tool_call_end|>
//   2. Llama/Groq XML format: <function=func_name>{"arg": "val"}</function>
//   3. Qwen/Hermes XML format: <tool_call>{"name": "func", "arguments": {}}</tool_call>
//   4. Bare JSON: {"tool_calls": [{"function": {"name": "...", "arguments": "..."}}]}
//   5. JS-quoted string arguments: arguments are JS object literals, not JSON
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Attempt to rescue tool calls from raw model output content.
 * Returns parsed ToolCall[] if any tool calls are found, or null if none.
 *
 * Tries each dialect in order of likelihood and returns the first match.
 */
export function rescueToolCalls(content: string): ToolCall[] | null {
  if (!content || content.trim().length === 0) return null;

  // Try each dialect in order
  const parsers: Array<(content: string) => ToolCall[] | null> = [
    parseKimiDeepSeekFormat,
    parseQwenHermesFormat,
    parseLlamaGroqFormat,
    parseBareJsonFormat,
    parseMarkdownCodeBlockJson,
  ];

  for (const parser of parsers) {
    try {
      const result = parser(content);
      if (result && result.length > 0) {
        return result;
      }
    } catch {
      // Parser failed, try next
      continue;
    }
  }

  return null;
}

// ============================================================================
// Dialect 1: Kimi / DeepSeek Token Format
// ============================================================================
// Format:
//   <|tool_call_begin|>function<|tool_call_separator|>{"name": "func", "args": {}}
//   <|tool_call_end|>
// ============================================================================

function parseKimiDeepSeekFormat(content: string): ToolCall[] | null {
  const toolCallPattern =
    /<\|tool_call_begin\|>(\w+)<\|tool_call_separator\|>([\s\S]*?)<\|tool_call_end\|>/g;

  const calls: ToolCall[] = [];
  let match: RegExpExecArray | null;

  while ((match = toolCallPattern.exec(content)) !== null) {
    const type = match[1];
    const rawArgs = match[2].trim();

    if (type === "function") {
      try {
        const parsed = safeJsonParse(rawArgs);
        if (parsed) {
          const fn = parsed.function as Record<string, unknown> | undefined;
          const name = parsed.name ?? fn?.name ?? "unknown";
          const args = parsed.arguments ?? parsed.args ?? fn?.arguments ?? {};
          calls.push({
            id: generateToolCallId(),
            type: "function",
            function: {
              name: String(name),
              arguments: typeof args === "string" ? args : JSON.stringify(args),
            },
          });
        }
      } catch {
        // Malformed, skip this call
      }
    }
  }

  return calls.length > 0 ? calls : null;
}

// ============================================================================
// Dialect 2: Qwen / Hermes XML Format
// ============================================================================
// Format:
//   <tool_call>{"name": "func_name", "arguments": {"key": "val"}}</tool_call>
//
// Or with XML tags:
//   <tool_call>
//     <name>func_name</name>
//     <arguments>{"key": "val"}</arguments>
//   </tool_call>
// ============================================================================

function parseQwenHermesFormat(content: string): ToolCall[] | null {
  const calls: ToolCall[] = [];

  // JSON-in-XML variant
  const jsonPattern = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g;
  let match: RegExpExecArray | null;

  while ((match = jsonPattern.exec(content)) !== null) {
    try {
      const parsed = safeJsonParse(match[1]);
      if (parsed && (parsed.name || parsed.function)) {
        const fn = parsed.function as Record<string, unknown> | undefined;
        const name = parsed.name ?? fn?.name ?? "unknown";
        const args = parsed.arguments ?? fn?.arguments ?? {};
        calls.push({
          id: generateToolCallId(),
          type: "function",
          function: {
            name: String(name),
            arguments: typeof args === "string" ? args : JSON.stringify(args),
          },
        });
      }
    } catch {
      // Malformed
    }
  }

  if (calls.length > 0) return calls;

  // XML-tags variant
  const xmlPattern =
    /<tool_call>\s*<name>\s*([^<]+?)\s*<\/name>\s*<arguments>\s*(\{[\s\S]*?\})\s*<\/arguments>\s*<\/tool_call>/g;

  while ((match = xmlPattern.exec(content)) !== null) {
    const name = match[1].trim();
    const argsStr = match[2].trim();
    // Validate args is valid JSON
    try {
      JSON.parse(argsStr);
    } catch {
      // Try to fix JS-quoted arguments
      const fixed = fixJsObjectLiteral(argsStr);
      if (!fixed) continue;
      calls.push({
        id: generateToolCallId(),
        type: "function",
        function: { name, arguments: fixed },
      });
      continue;
    }
    calls.push({
      id: generateToolCallId(),
      type: "function",
      function: { name, arguments: argsStr },
    });
  }

  return calls.length > 0 ? calls : null;
}

// ============================================================================
// Dialect 3: Llama / Groq XML Format
// ============================================================================
// Format:
//   <function=func_name>{"param": "value"}</function>
//
// Or multi-call:
//   <function=func_name>{"param": "value"}</function>\n<function=other>{}</function>
// ============================================================================

function parseLlamaGroqFormat(content: string): ToolCall[] | null {
  const pattern = /<function=([^>]+)>([\s\S]*?)<\/function>/g;
  const calls: ToolCall[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const name = match[1].trim();
    const rawArgs = match[2].trim();

    // Arguments might be JSON or JS object literal
    let argsStr: string;
    try {
      JSON.parse(rawArgs);
      argsStr = rawArgs;
    } catch {
      const fixed = fixJsObjectLiteral(rawArgs);
      if (!fixed) {
        // If we can't fix it, store as-is and let the caller handle it
        argsStr = rawArgs;
      } else {
        argsStr = fixed;
      }
    }

    calls.push({
      id: generateToolCallId(),
      type: "function",
      function: { name, arguments: argsStr },
    });
  }

  return calls.length > 0 ? calls : null;
}

// ============================================================================
// Dialect 4: Bare JSON Format
// ============================================================================
// Format:
//   Some text before
//   {"tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "func", "arguments": "{\"key\": \"val\"}"}}]}
//   Some text after
// ============================================================================

function parseBareJsonFormat(content: string): ToolCall[] | null {
  // Look for tool_calls array in the content
  const toolCallsMatch = content.match(
    /"tool_calls"\s*:\s*(\[[\s\S]*?\])\s*[,}\n]/
  );

  if (!toolCallsMatch) return null;

  try {
    const toolCallsArray = safeJsonParse(toolCallsMatch[1]);
    if (!Array.isArray(toolCallsArray)) return null;

    const calls: ToolCall[] = [];

    for (const tc of toolCallsArray) {
      if (!tc || typeof tc !== "object") continue;

      const tcObj = tc as Record<string, unknown>;
      const func = tcObj.function as Record<string, unknown> | undefined;
      if (!func) continue;

      const name = func.name as string | undefined;
      if (!name) continue;

      let argsStr: string;
      if (typeof func.arguments === "string") {
        argsStr = func.arguments;
      } else if (typeof func.arguments === "object") {
        argsStr = JSON.stringify(func.arguments);
      } else {
        argsStr = String(func.arguments ?? "{}");
      }

      calls.push({
        id: (tcObj.id as string) || generateToolCallId(),
        type: "function",
        function: { name, arguments: argsStr },
      });
    }

    return calls.length > 0 ? calls : null;
  } catch {
    return null;
  }
}

// ============================================================================
// Dialect 5: Markdown Code Block JSON
// ============================================================================
// Format:
//   ```json
//   {"tool_calls": [...]}
//   ```
// ============================================================================

function parseMarkdownCodeBlockJson(content: string): ToolCall[] | null {
  const codeBlockMatch = content.match(
    /```(?:json)?\s*\n?(\{[\s\S]*?\})\n?\s*```/
  );

  if (!codeBlockMatch) return null;

  try {
    const parsed = safeJsonParse(codeBlockMatch[1]);
    if (!parsed || typeof parsed !== "object") return null;

    const toolCalls = (parsed as Record<string, unknown>).tool_calls;
    if (!Array.isArray(toolCalls)) return null;

    const calls: ToolCall[] = [];

    for (const tc of toolCalls) {
      if (!tc || typeof tc !== "object") continue;
      const tcObj = tc as Record<string, unknown>;
      const func = tcObj.function as Record<string, unknown> | undefined;
      if (!func) continue;

      const name = func.name as string | undefined;
      if (!name) continue;

      let argsStr: string;
      if (typeof func.arguments === "string") {
        argsStr = func.arguments;
      } else if (typeof func.arguments === "object") {
        argsStr = JSON.stringify(func.arguments);
      } else {
        argsStr = String(func.arguments ?? "{}");
      }

      calls.push({
        id: (tcObj.id as string) || generateToolCallId(),
        type: "function",
        function: { name, arguments: argsStr },
      });
    }

    return calls.length > 0 ? calls : null;
  } catch {
    return null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safely parse JSON, returning null on failure instead of throwing.
 */
function safeJsonParse(str: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Attempt to fix JavaScript object literals that are not valid JSON.
 * Handles:
 *   - Unquoted keys: {key: "val"} -> {"key": "val"}
 *   - Single-quoted strings: {'key': 'val'} -> {"key": "val"}
 *   - Trailing commas: {"key": "val",} -> {"key": "val"}
 *   - JS special values: undefined, NaN, Infinity
 */
function fixJsObjectLiteral(input: string): string | null {
  try {
    let fixed = input;

    // Remove trailing commas before } or ]
    fixed = fixed.replace(/,\s*([}\]])/g, "$1");

    // Replace single quotes with double quotes (careful with nested quotes)
    // This is a simple heuristic — for complex cases, use a proper parser
    fixed = fixed.replace(/'([^']*)'([^']*):/g, '"$1"$2:');
    fixed = fixed.replace(/:\s*'([^']*)'/g, ': "$1"');

    // Quote unquoted keys
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

    // Replace JS special values
    fixed = fixed.replace(/:\s*undefined\b/g, ': null');
    fixed = fixed.replace(/:\s*NaN\b/g, ': null');
    fixed = fixed.replace(/:\s*Infinity\b/g, ': 1e308');
    fixed = fixed.replace(/:\s*-Infinity\b/g, ': -1e308');

    // Validate the result
    JSON.parse(fixed);
    return fixed;
  } catch {
    return null;
  }
}

/**
 * Generate a unique tool call ID.
 */
function generateToolCallId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "call_";
  for (let i = 0; i < 24; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
