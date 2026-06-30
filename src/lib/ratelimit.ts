// Rate limiting and circuit breaker tracking per provider key

export interface RateLimitState {
  providerId: string;
  modelKey?: string; // "provider:model-id" for per-model tracking
  windowStart: number; // timestamp ms
  requestCount: number;
  tokenCount: number;
  // Circuit breaker
  consecutiveFailures: number;
  cooldownUntil: number; // timestamp ms, 0 = not in cooldown
  lastErrorCode?: string;
  // Penalty (decays over time)
  penaltyScore: number;
  lastPenaltyAt: number;
}

export interface RateLimitConfig {
  windowMs: number; // sliding window size (default 60000 = 1 min)
  maxRequestsPerWindow: number;
  maxTokensPerWindow: number;
  // Circuit breaker
  failureThreshold: number; // failures before opening circuit
  cooldownMs: number; // base cooldown duration
  maxCooldownMs: number; // max cooldown (exponential backoff cap)
  // Penalty decay
  penaltyDecayMs: number; // time for penalty to halve
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60000,
  maxRequestsPerWindow: 30,
  maxTokensPerWindow: 100000,
  failureThreshold: 3,
  cooldownMs: 30000,
  maxCooldownMs: 300000,
  penaltyDecayMs: 300000,
};

export class RateLimiter {
  private states = new Map<string, RateLimitState>();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getKey(providerId: string, modelKey?: string): string {
    return modelKey || providerId;
  }

  private getOrCreateState(providerId: string, modelKey?: string): RateLimitState {
    const key = this.getKey(providerId, modelKey);
    let state = this.states.get(key);
    if (!state) {
      state = {
        providerId,
        modelKey,
        windowStart: Date.now(),
        requestCount: 0,
        tokenCount: 0,
        consecutiveFailures: 0,
        cooldownUntil: 0,
        penaltyScore: 0,
        lastPenaltyAt: 0,
      };
      this.states.set(key, state);
    }
    return state;
  }

  /** Check if a provider is currently in cooldown */
  isInCooldown(providerId: string, modelKey?: string): boolean {
    const state = this.getOrCreateState(providerId, modelKey);
    return Date.now() < state.cooldownUntil;
  }

  /** Get remaining cooldown ms, 0 if not in cooldown */
  getCooldownRemaining(providerId: string, modelKey?: string): number {
    const state = this.getOrCreateState(providerId, modelKey);
    const remaining = state.cooldownUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /** Check if a request is allowed (not rate limited, not in cooldown) */
  isAllowed(providerId: string, estimatedTokens = 0, modelKey?: string): boolean {
    const state = this.getOrCreateState(providerId, modelKey);

    // Check cooldown first
    if (Date.now() < state.cooldownUntil) return false;

    // Reset window if expired
    const now = Date.now();
    if (now - state.windowStart > this.config.windowMs) {
      state.windowStart = now;
      state.requestCount = 0;
      state.tokenCount = 0;
    }

    // Check rate limits
    if (state.requestCount >= this.config.maxRequestsPerWindow) return false;
    if (estimatedTokens > 0 && state.tokenCount + estimatedTokens > this.config.maxTokensPerWindow) return false;

    return true;
  }

  /** Decay penalty score based on time elapsed */
  private decayPenalty(state: RateLimitState): void {
    if (state.penaltyScore <= 0) return;
    const elapsed = Date.now() - state.lastPenaltyAt;
    const decayFactor = elapsed / this.config.penaltyDecayMs;
    state.penaltyScore = Math.max(0, state.penaltyScore - decayFactor * state.penaltyScore);
  }

  /** Record a successful request */
  recordSuccess(providerId: string, tokens = 0, modelKey?: string): void {
    const state = this.getOrCreateState(providerId, modelKey);
    state.consecutiveFailures = 0;
    state.cooldownUntil = 0;
    state.lastErrorCode = undefined;
    // Decay penalty
    this.decayPenalty(state);
    // Count request
    state.requestCount++;
    state.tokenCount += tokens;
  }

  /** Record a failed request */
  recordFailure(providerId: string, errorCode?: string, modelKey?: string): void {
    const state = this.getOrCreateState(providerId, modelKey);
    state.consecutiveFailures++;
    state.lastErrorCode = errorCode;
    state.requestCount++;

    // Add penalty (429s get higher penalty)
    const penaltyAmount = errorCode === "429" ? 20 : errorCode === "402" ? 50 : 10;
    this.decayPenalty(state);
    state.penaltyScore += penaltyAmount;
    state.lastPenaltyAt = Date.now();

    // Check circuit breaker
    if (state.consecutiveFailures >= this.config.failureThreshold) {
      const backoffMultiplier = Math.min(
        Math.pow(2, state.consecutiveFailures - this.config.failureThreshold),
        this.config.maxCooldownMs / this.config.cooldownMs
      );
      const cooldownDuration = this.config.cooldownMs * backoffMultiplier;
      state.cooldownUntil = Date.now() + Math.min(cooldownDuration, this.config.maxCooldownMs);
    }
  }

  /** Get penalty score (after decay) */
  getPenaltyScore(providerId: string, modelKey?: string): number {
    const state = this.getOrCreateState(providerId, modelKey);
    this.decayPenalty(state);
    return state.penaltyScore;
  }

  /** Get full state for debugging */
  getState(providerId: string, modelKey?: string): Readonly<RateLimitState> | undefined {
    const key = this.getKey(providerId, modelKey);
    return this.states.get(key);
  }

  /** Get all tracked states */
  getAllStates(): ReadonlyMap<string, RateLimitState> {
    return this.states;
  }

  /** Reset all state for a provider */
  reset(providerId: string): void {
    for (const [key, state] of this.states) {
      if (state.providerId === providerId) {
        this.states.delete(key);
      }
    }
  }

  /** Reset all state */
  resetAll(): void {
    this.states.clear();
  }
}

// Global singleton
export const rateLimiter = new RateLimiter();
