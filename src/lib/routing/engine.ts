// @ts-nocheck
// ============================================================================
// Routing Engine
// ============================================================================
// Main routing engine that resolves model aliases to provider+model pairs,
// scores them via the UCB1 bandit, and iterates with failover.
//
// Features:
//   - Alias resolution to candidate provider+model pairs
//   - UCB1 bandit scoring for candidate ranking
//   - Circuit breaker integration (exponential backoff cooldown)
//   - Session stickiness (remember last successful model per conversation)
//   - Token budget awareness (monthly free-tier budgets per provider)
//   - 402 payment-required handling (long cooldown + skip same-model-on-other-keys)
// ============================================================================

import {
  getModelAlias,
  getProviderConfig,
  getActiveProviderIds,
  getModelFamily,
} from "@/lib/providers/config";
import { createProviderAdapter } from "@/lib/providers/factory";
import { NormalizedChatRequest, NormalizedChatResponse, NormalizedStreamChunk } from "@/lib/providers/contract";
import { BanditScorer, ScoredCandidate } from "./bandit";
import { RoutingDecision } from "./types";
import { checkCircuitState, recordSuccess as recordCircuitSuccess, recordFailure as recordCircuitFailure } from "./circuit-breaker";
import { getSessionLock, createSession, switchProvider } from "./session";
import { buildContextHandoff } from "./context-handoff";
import logger from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface RouteRequest {
  /** Model alias (e.g. "coder-fast") or specific model ID */
  alias: string;
  messages: NormalizedChatRequest["messages"];
  sessionId?: string;
  userId: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  tools?: NormalizedChatRequest["tools"];
  toolChoice?: NormalizedChatRequest["toolChoice"];
  responseFormat?: NormalizedChatRequest["responseFormat"];
  gatewayRequestId: string;
  estimatedTokens?: number;
  /** Providers to exclude (e.g. after previous failover) */
  excludeProviders?: string[];
}

export interface RouteResult {
  success: boolean;
  response?: NormalizedChatResponse;
  stream?: AsyncGenerator<NormalizedStreamChunk>;
  providerId: string;
  modelId: string;
  modelKey: string;
  latencyMs: number;
  failoverCount: number;
  candidates: ScoredCandidate[];
  error?: string;
  errorCode?: string;
}

export interface ModelCandidate {
  providerId: string;
  modelId: string;
  modelKey: string;
  /** Resolved from alias mapping */
  alias: string;
}

export interface RouterConfig {
  /** Maximum number of failover attempts (default 5) */
  maxFailovers: number;
  /** Whether to enable session stickiness (default true) */
  sessionStickiness: boolean;
  /** Monthly token budget per provider (providerId -> tokens) */
  monthlyBudgets: Record<string, number>;
}

const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  maxFailovers: 5,
  sessionStickiness: true,
  monthlyBudgets: {
    gemini: 1_000_000,
    groq: 5_000_000,
    openrouter: 500_000,
    cerebras: 1_000_000,
    sambanova: 2_000_000,
    cohere: 1_000_000,
    huggingface: 1_000_000,
    together: 1_000_000,
    fireworks: 2_000_000,
    ollama: 999_999_999,
    vllm: 999_999_999,
    xiaomimimo: 500_000,
  },
};

// ============================================================================
// Router Class
// ============================================================================

export class Router {
  private bandit: BanditScorer;
  private config: RouterConfig;
  /** Track monthly token usage per provider (in-memory, reset on restart) */
  private monthlyUsage = new Map<string, number>();

  constructor(bandit?: BanditScorer, config?: Partial<RouterConfig>) {
    this.bandit = bandit ?? new BanditScorer();
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config };
  }

  /** Expose the bandit for external access */
  getBandit(): BanditScorer {
    return this.bandit;
  }

  // ------------------------------------------------------------------
  // Main Route Method
  // ------------------------------------------------------------------

  async route(request: RouteRequest): Promise<RouteResult> {
    const startTime = Date.now();
    const candidates = this.getCandidates(request.alias);
    const failoverCandidates: ScoredCandidate[] = [];
    let failoverCount = 0;

    if (candidates.length === 0) {
      return {
        success: false,
        providerId: "",
        modelId: "",
        modelKey: "",
        latencyMs: Date.now() - startTime,
        failoverCount: 0,
        candidates: [],
        error: `No provider candidates found for alias "${request.alias}"`,
        errorCode: "no_candidates",
      };
    }

    // Check session stickiness — if locked, prefer that provider
    let stickyModelKey: string | undefined;
    if (this.config.sessionStickiness && request.sessionId) {
      const aliasConfig = getModelAlias(request.alias);
      const family = aliasConfig
        ? this.inferFamilyFromAlias(request.alias)
        : "unknown";

      const lock = await getSessionLock(
        request.sessionId,
        request.userId,
        request.alias,
        family
      );

      if (lock.locked && lock.providerId) {
        // Find the matching model key for the locked provider
        const locked = candidates.find(
          (c) => c.providerId === lock.providerId
        );
        if (locked) {
          stickyModelKey = locked.modelKey;
          logger.info(
            { sessionId: request.sessionId, providerId: lock.providerId },
            "Router: session sticky to provider"
          );
        }
      }
    }

    // Score all candidates via bandit
    const banditCandidates = candidates.map((c) => ({
      modelKey: c.modelKey,
      providerId: c.providerId,
      modelId: c.modelId,
      intelligenceTier: 2 as const,
      supportsReasoning: false,
      isPreferred: false,
      penaltyScore: 0,
    }));
    let scored = this.bandit.rankCandidates(banditCandidates);

    // If sticky, move sticky candidate to front
    if (stickyModelKey) {
      const stickyIdx = scored.findIndex((s: { modelKey: string }) => s.modelKey === stickyModelKey);
      if (stickyIdx > 0) {
        const [sticky] = scored.splice(stickyIdx, 1);
        scored.unshift(sticky);
      }
    }

    // Filter out excluded providers
    if (request.excludeProviders && request.excludeProviders.length > 0) {
      scored = scored.filter(
        (s: { providerId: string }) => !request.excludeProviders!.includes(s.providerId)
      );
    }

    // Filter out candidates with exhausted monthly budgets
    scored = scored.filter((s: { providerId: string }) => {
      const budget = this.config.monthlyBudgets[s.providerId] ?? 0;
      const used = this.monthlyUsage.get(s.providerId) ?? 0;
      return used < budget;
    });

    // Filter out candidates with open circuits (but keep them as last resort)
    const circuitOpenKeys = new Set<string>();
    for (const s of scored) {
      const circuit = await checkCircuitState(s.providerId);
      if (!circuit.allowed) {
        circuitOpenKeys.add(s.modelKey);
      }
    }

    // Sort: circuit-closed first, circuit-open last
    const available = scored.filter((s) => !circuitOpenKeys.has(s.modelKey));
    const circuitBlocked = scored.filter((s) => circuitOpenKeys.has(s.modelKey));

    // Try available first, then circuit-blocked as last resort
    const orderedCandidates = [...available, ...circuitBlocked];

    if (orderedCandidates.length === 0) {
      return {
        success: false,
        providerId: "",
        modelId: "",
        modelKey: "",
        latencyMs: Date.now() - startTime,
        failoverCount: 0,
        candidates: scored,
        error: "All provider candidates are unavailable (circuit open or budget exhausted)",
        errorCode: "all_unavailable",
      };
    }

    // Iterate through candidates with failover
    for (let i = 0; i < Math.min(orderedCandidates.length, this.config.maxFailovers + 1); i++) {
      const candidate = orderedCandidates[i];
      failoverCandidates.push(candidate);

      logger.info(
        {
          modelKey: candidate.modelKey,
          score: candidate.totalScore.toFixed(4),
          attempt: i + 1,
          maxAttempts: Math.min(orderedCandidates.length, this.config.maxFailovers + 1),
        },
        "Router: attempting provider"
      );

      // Build the normalized request
      const chatRequest: NormalizedChatRequest = {
        model: candidate.modelId,
        messages: request.messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        tools: request.tools,
        toolChoice: request.toolChoice,
        responseFormat: request.responseFormat,
        stream: request.stream,
        gatewayRequestId: request.gatewayRequestId,
        sessionId: request.sessionId,
        modelAlias: request.alias,
        modelFamily: getModelFamily(candidate.modelId),
      };

      // Apply context handoff if this is a failover (not the first attempt)
      if (i > 0) {
        chatRequest.messages = buildContextHandoff(request.messages);
      }

      const providerStart = Date.now();

      try {
        const adapter = createProviderAdapter(candidate.providerId);

        if (request.stream) {
          // Streaming response
          const stream = adapter.stream(chatRequest);
          return {
            success: true,
            stream,
            providerId: candidate.providerId,
            modelId: candidate.modelId,
            modelKey: candidate.modelKey,
            latencyMs: Date.now() - startTime,
            failoverCount,
            candidates: failoverCandidates,
          };
        } else {
          // Non-streaming response
          const response = await adapter.chat(chatRequest);
          const latencyMs = Date.now() - providerStart;

          // Record success
          this.markSuccess(candidate.modelKey, latencyMs, response.usage.totalTokens);

          // Update session stickiness
          if (this.config.sessionStickiness && request.sessionId) {
            if (!request.sessionId.startsWith("new-")) {
              await switchProvider(
                request.sessionId,
                candidate.providerId,
                candidate.modelId,
                `failover:${candidate.modelKey}`
              );
            } else {
              await createSession(
                request.sessionId,
                request.userId,
                candidate.providerId,
                request.alias,
                candidate.modelId
              );
            }
          }

          // Track monthly usage
          this.trackUsage(candidate.providerId, response.usage.totalTokens);

          return {
            success: true,
            response,
            providerId: candidate.providerId,
            modelId: candidate.modelId,
            modelKey: candidate.modelKey,
            latencyMs: Date.now() - startTime,
            failoverCount,
            candidates: failoverCandidates,
          };
        }
      } catch (error: unknown) {
        const latencyMs = Date.now() - providerStart;
        const { errorCode, statusCode, retryable } = this.classifyError(error);

        logger.warn(
          {
            modelKey: candidate.modelKey,
            errorCode,
            statusCode,
            retryable,
            latencyMs,
            attempt: i + 1,
          },
          "Router: provider failed, evaluating failover"
        );

        // Record failure in bandit and circuit breaker
        this.markFailure(candidate.modelKey, errorCode);
        await recordCircuitFailure(candidate.providerId, errorCode);

        // Handle 402: payment required — skip same model on other keys
        if (errorCode === "402" || statusCode === 402) {
          logger.warn(
            { modelKey: candidate.modelKey },
            "Router: payment required, skipping same model on other providers"
          );
          // Remove any remaining candidates with the same model ID
          for (let j = i + 1; j < orderedCandidates.length; j++) {
            if (orderedCandidates[j].modelId === candidate.modelId) {
              orderedCandidates.splice(j, 1);
              j--;
            }
          }
        }

        failoverCount++;

        // If this was the last candidate, return failure
        if (i === orderedCandidates.length - 1 || failoverCount >= this.config.maxFailovers) {
          return {
            success: false,
            providerId: candidate.providerId,
            modelId: candidate.modelId,
            modelKey: candidate.modelKey,
            latencyMs: Date.now() - startTime,
            failoverCount,
            candidates: failoverCandidates,
            error: `All provider candidates failed. Last error: ${errorCode}`,
            errorCode,
          };
        }

        // Otherwise continue to next candidate
        continue;
      }
    }

    // Should not reach here, but safety net
    return {
      success: false,
      providerId: "",
      modelId: "",
      modelKey: "",
      latencyMs: Date.now() - startTime,
      failoverCount,
      candidates: failoverCandidates,
      error: "Routing exhausted all candidates",
      errorCode: "routing_exhausted",
    };
  }

  // ------------------------------------------------------------------
  // Candidate Resolution
  // ------------------------------------------------------------------

  /**
   * Resolve a model alias to a list of candidate provider+model pairs.
   * Returns candidates in preferred -> fallback order.
   */
  getCandidates(alias: string): ModelCandidate[] {
    const aliasConfig = getModelAlias(alias);
    const candidates: ModelCandidate[] = [];
    const seen = new Set<string>();

    if (aliasConfig) {
      // Use preferred + fallback provider ordering
      const providerOrder = [
        ...aliasConfig.preferredProviders,
        ...aliasConfig.fallbackProviders,
      ];

      for (const providerId of providerOrder) {
        const config = getProviderConfig(providerId);
        if (!config) continue;

        // Check if provider has API key configured
        const activeIds = getActiveProviderIds();
        if (!activeIds.includes(providerId)) continue;

        const modelId = config.modelMapping[alias];
        if (!modelId) continue;

        const modelKey = `${providerId}:${modelId}`;
        if (seen.has(modelKey)) continue;
        seen.add(modelKey);

        candidates.push({ providerId, modelId, modelKey, alias });
      }
    } else {
      // Not a known alias — try to match as a specific model ID across all providers
      const activeIds = getActiveProviderIds();
      for (const providerId of activeIds) {
        const config = getProviderConfig(providerId);
        if (!config) continue;

        // Check if any alias maps to this model for this provider
        for (const [a, modelId] of Object.entries(config.modelMapping)) {
          if (modelId === alias) {
            const modelKey = `${providerId}:${modelId}`;
            if (seen.has(modelKey)) continue;
            seen.add(modelKey);
            candidates.push({ providerId, modelId, modelKey, alias: a });
          }
        }

        // Also check if the alias IS the model ID itself
        const modelKey = `${providerId}:${alias}`;
        if (!seen.has(modelKey)) {
          seen.add(modelKey);
          candidates.push({ providerId, modelId: alias, modelKey, alias });
        }
      }
    }

    logger.debug(
      { alias, candidateCount: candidates.length, candidates: candidates.map((c) => c.modelKey) },
      "Router: resolved candidates"
    );

    return candidates;
  }

  // ------------------------------------------------------------------
  // Success / Failure Recording
  // ------------------------------------------------------------------

  markSuccess(modelKey: string, latencyMs: number, tokens: number): void {
    this.bandit.recordSuccess(modelKey, latencyMs, tokens);

    const [providerId] = modelKey.split(":");
    recordCircuitSuccess(providerId).catch((err: unknown) => {
      logger.error({ err, providerId }, "Router: failed to record circuit success");
    });
  }

  markFailure(modelKey: string, errorCode: string): void {
    this.bandit.recordFailure(modelKey, 2, false);

    const [providerId] = modelKey.split(":");
    recordCircuitFailure(providerId, errorCode).catch((err: unknown) => {
      logger.error({ err, providerId }, "Router: failed to record circuit failure");
    });
  }

  // ------------------------------------------------------------------
  // Monthly Budget Tracking
  // ------------------------------------------------------------------

  private trackUsage(providerId: string, tokens: number): void {
    const current = this.monthlyUsage.get(providerId) ?? 0;
    this.monthlyUsage.set(providerId, current + tokens);
  }

  /** Get current monthly token usage for a provider */
  getMonthlyUsage(providerId: string): number {
    return this.monthlyUsage.get(providerId) ?? 0;
  }

  /** Get remaining budget for a provider */
  getRemainingBudget(providerId: string): number {
    const budget = this.config.monthlyBudgets[providerId] ?? 0;
    const used = this.monthlyUsage.get(providerId) ?? 0;
    return Math.max(0, budget - used);
  }

  /** Reset all monthly usage counters (call at start of each month) */
  resetMonthlyUsage(): void {
    this.monthlyUsage.clear();
    logger.info("Router: monthly usage counters reset");
  }

  // ------------------------------------------------------------------
  // Error Classification
  // ------------------------------------------------------------------

  private classifyError(error: unknown): {
    errorCode: string;
    statusCode: number | undefined;
    retryable: boolean;
  } {
    // Try to extract from normalized error
    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>;

      // Normalized error from adapter
      if ("code" in err && typeof err.code === "string") {
        const code = err.code as string;
        const statusCode = typeof err.statusCode === "number" ? err.statusCode as number : undefined;
        const retryable = typeof err.retryable === "boolean" ? err.retryable as boolean : this.isRetryableCode(code, statusCode);
        return { errorCode: code, statusCode, retryable };
      }

      // HTTP-like error
      if ("status" in err && typeof err.status === "number") {
        const status = err.status as number;
        return {
          errorCode: String(status),
          statusCode: status,
          retryable: this.isRetryableStatus(status),
        };
      }

      // Error with statusCode
      if ("statusCode" in err && typeof err.statusCode === "number") {
        const status = err.statusCode as number;
        return {
          errorCode: String(status),
          statusCode: status,
          retryable: this.isRetryableStatus(status),
        };
      }
    }

    // String error
    if (typeof error === "string") {
      const status = this.extractStatusFromString(error);
      if (status) {
        return {
          errorCode: String(status),
          statusCode: status,
          retryable: this.isRetryableStatus(status),
        };
      }
      return { errorCode: "unknown_error", statusCode: undefined, retryable: false };
    }

    return { errorCode: "unknown_error", statusCode: undefined, retryable: false };
  }

  private isRetryableCode(code: string, statusCode?: number): boolean {
    if (statusCode) return this.isRetryableStatus(statusCode);
    const retryableCodes = new Set([
      "rate_limit_exceeded",
      "provider_unavailable",
      "provider_timeout",
      "provider_error",
      "model_overloaded",
    ]);
    return retryableCodes.has(code);
  }

  private isRetryableStatus(status: number): boolean {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  private extractStatusFromString(error: string): number | undefined {
    const match = error.match(/\b(4\d{2}|5\d{2})\b/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private inferFamilyFromAlias(alias: string): string {
    const aliasConfig = getModelAlias(alias);
    if (!aliasConfig || aliasConfig.preferredProviders.length === 0) return "unknown";
    const providerId = aliasConfig.preferredProviders[0];
    const config = getProviderConfig(providerId);
    if (!config) return "unknown";
    const modelId = config.modelMapping[alias];
    if (!modelId) return "unknown";
    return getModelFamily(modelId);
  }
}

// ============================================================================
// Standalone wrapper functions (for route handlers)
// ============================================================================

export interface ChatRoutingResult {
  adapter: ReturnType<typeof createProviderAdapter>;
  providerId: string;
  modelId: string;
  modelFamily: string;
  decision: RoutingDecision;
}

export async function routeChat(request: RouteRequest): Promise<ChatRoutingResult> {
  const router = new Router();
  const result = await router.route(request);
  const adapter = createProviderAdapter(result.providerId);
  return {
    adapter,
    providerId: result.providerId,
    modelId: result.modelId,
    modelFamily: "unknown",
    decision: {
      requestId: request.gatewayRequestId,
      alias: request.alias,
      selectedProvider: result.providerId,
      selectedModel: result.modelId,
      familyRequested: "unknown",
      familyUsed: "unknown",
      score: 0,
      reason: result.success ? "success" : (result.error ?? "error"),
      tier: 1,
      candidates: [],
      latencyMs: result.latencyMs,
      createdAt: new Date(),
      sessionId: request.sessionId,
    },
  };
}

export function recordProviderResult(
  providerId: string,
  success: boolean,
  latencyMs: number,
  tokensIn: number,
  tokensOut: number,
  errorMessage?: string,
): void {
  const bandit = new BanditScorer();
  const modelKey = providerId + ":default";
  if (success) {
    bandit.recordSuccess(modelKey, latencyMs, tokensOut);
  } else {
    bandit.recordFailure(modelKey, 2, false);
  }
}

export interface EmbeddingRoutingResult {
  adapter: ReturnType<typeof createProviderAdapter>;
  providerId: string;
  modelId: string;
}

export async function routeEmbedding(request: {
  alias: string;
  input: string | string[];
  gatewayRequestId: string;
}): Promise<EmbeddingRoutingResult> {
  const router = new Router();
  const aliasConfig = getModelAlias(request.alias);
  const providerId = aliasConfig?.preferredProviders[0] ?? getActiveProviderIds()[0];
  const config = getProviderConfig(providerId);
  const modelId = config?.modelMapping[request.alias] ?? request.alias;
  const adapter = createProviderAdapter(providerId, modelId);
  return { adapter, providerId, modelId };
}
