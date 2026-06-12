// UCB1 Multi-Armed Bandit scoring for provider routing
// Tracks per-model-key reliability, speed, and intelligence to make smart routing decisions

export interface ModelStats {
  modelKey: string; // "provider:model-id"
  successCount: number;
  failCount: number;
  totalRequests: number;
  // Speed tracking
  latencySumMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  // Token throughput tracking
  tokensOutputSum: number;
  throughputSumTps: // tokens per second
  number;
  // Quota
  quotaUsed: number; // 0-1, percentage of monthly quota used
  // Intelligence (static tier, 1=best)
  intelligenceTier: 1 | 2 | 3;
  // Reasoning capability
  supportsReasoning: boolean;
  // Last updated
  lastUsedAt: number;
  firstUsedAt: number;
}

export interface ScoredCandidate {
  modelKey: string;
  providerId: string;
  modelId: string;
  totalScore: number;
  reliabilityScore: number;
  speedScore: number;
  intelligenceScore: number;
  quotaScore: number;
  penaltyScore: number;
  stats: ModelStats;
  isPreferred: boolean;
}

export interface BanditConfig {
  explorationWeight: number; // how much to explore vs exploit (0.3 = default)
  speedWeight: number; // weight for speed component (0.25)
  reliabilityWeight: number; // weight for reliability component (0.35)
  intelligenceWeight: number; // weight for intelligence component (0.20)
  quotaWeight: number; // weight for quota headroom component (0.10)
  penaltyWeight: number; // weight for rate-limit penalty (0.10)
  newModelBonus: number; // bonus for models with < 10 requests
  reasoningBonus: number; // bonus for reasoning-capable models
}

const DEFAULT_CONFIG: BanditConfig = {
  explorationWeight: 0.3,
  speedWeight: 0.25,
  reliabilityWeight: 0.35,
  intelligenceWeight: 0.20,
  quotaWeight: 0.10,
  penaltyWeight: 0.10,
  newModelBonus: 15,
  reasoningBonus: 5,
};

export class BanditScorer {
  private stats = new Map<string, ModelStats>();
  private config: BanditConfig;
  private totalGlobalRequests = 0;

  constructor(config: Partial<BanditConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getOrCreateStats(modelKey: string, intelligenceTier: 1 | 2 | 3 = 2, supportsReasoning = false): ModelStats {
    let s = this.stats.get(modelKey);
    if (!s) {
      const now = Date.now();
      s = {
        modelKey,
        successCount: 0,
        failCount: 0,
        totalRequests: 0,
        latencySumMs: 0,
        minLatencyMs: Infinity,
        maxLatencyMs: 0,
        tokensOutputSum: 0,
        throughputSumTps: 0,
        quotaUsed: 0,
        intelligenceTier,
        supportsReasoning,
        lastUsedAt: now,
        firstUsedAt: now,
      };
      this.stats.set(modelKey, s);
    }
    return s;
  }

  /** Record a successful request */
  recordSuccess(modelKey: string, latencyMs: number, tokensOutput: number, intelligenceTier: 1 | 2 | 3 = 2, supportsReasoning = false): void {
    const s = this.getOrCreateStats(modelKey, intelligenceTier, supportsReasoning);
    s.successCount++;
    s.totalRequests++;
    s.latencySumMs += latencyMs;
    s.minLatencyMs = Math.min(s.minLatencyMs, latencyMs);
    s.maxLatencyMs = Math.max(s.maxLatencyMs, latencyMs);
    s.tokensOutputSum += tokensOutput;
    if (latencyMs > 0) {
      const tps = (tokensOutput / latencyMs) * 1000;
      s.throughputSumTps += tps;
    }
    s.lastUsedAt = Date.now();
    this.totalGlobalRequests++;
  }

  /** Record a failed request */
  recordFailure(modelKey: string, intelligenceTier: 1 | 2 | 3 = 2, supportsReasoning = false): void {
    const s = this.getOrCreateStats(modelKey, intelligenceTier, supportsReasoning);
    s.failCount++;
    s.totalRequests++;
    s.lastUsedAt = Date.now();
    this.totalGlobalRequests++;
  }

  /** Set quota usage for a model (0-1) */
  setQuotaUsed(modelKey: string, quotaUsed: number): void {
    const s = this.getOrCreateStats(modelKey);
    s.quotaUsed = Math.max(0, Math.min(1, quotaUsed));
  }

  /**
   * Score a single model key using UCB1 + multi-factor weighting.
   * Higher score = better candidate.
   */
  score(modelKey: string, penaltyScore = 0): number {
    const s = this.stats.get(modelKey);
    if (!s) {
      // Brand new model — give it exploration bonus
      return this.config.newModelBonus;
    }

    // 1. Reliability (Beta posterior mean with UCB1 exploration bonus)
    const total = s.successCount + s.failCount;
    const successRate = total > 0 ? s.successCount / total : 0.5;
    // UCB1 exploration bonus: sqrt(2 * ln(N) / n_i)
    const explorationBonus = total > 0 && this.totalGlobalRequests > 0
      ? Math.sqrt((2 * Math.log(this.totalGlobalRequests)) / total)
      : 1.0;
    const reliabilityScore = (successRate * 100) + this.config.explorationWeight * explorationBonus * 10;

    // 2. Speed (inverse latency + throughput)
    const avgLatencyMs = total > 0 ? s.latencySumMs / total : 5000;
    const avgThroughput = total > 0 ? s.throughputSumTps / total : 0;
    // Normalize: 0-100 scale
    const latencyScore = Math.max(0, 100 - (avgLatencyMs / 100)); // 10s = 0 score
    const throughputScore = Math.min(100, avgThroughput / 10); // 1000 tps = 100
    const speedScore = (latencyScore * 0.6 + throughputScore * 0.4);

    // 3. Intelligence (tier-based)
    // Tier 1 = 100, Tier 2 = 66, Tier 3 = 33
    const intelligenceScore = s.intelligenceTier === 1 ? 100 : s.intelligenceTier === 2 ? 66 : 33;
    const reasoningBonus = s.supportsReasoning ? this.config.reasoningBonus : 0;

    // 4. Quota headroom (1 - used percentage)
    const quotaScore = (1 - s.quotaUsed) * 100;

    // 5. Penalty (subtracted)
    const normalizedPenalty = Math.min(100, penaltyScore);

    // Weighted total
    const totalScore =
      this.config.reliabilityWeight * reliabilityScore +
      this.config.speedWeight * speedScore +
      this.config.intelligenceWeight * (intelligenceScore + reasoningBonus) +
      this.config.quotaWeight * quotaScore -
      this.config.penaltyWeight * normalizedPenalty;

    return totalScore;
  }

  /**
   * Score all candidates and return sorted by score (highest first).
   */
  rankCandidates(
    candidates: Array<{ modelKey: string; providerId: string; modelId: string; intelligenceTier: 1 | 2 | 3; supportsReasoning: boolean; isPreferred: boolean; penaltyScore: number }>
  ): ScoredCandidate[] {
    const scored: ScoredCandidate[] = candidates.map((c) => {
      const stats = this.getOrCreateStats(c.modelKey, c.intelligenceTier, c.supportsReasoning);
      const s = stats;
      const total = s.successCount + s.failCount;
      const successRate = total > 0 ? s.successCount / total : 0.5;
      const explorationBonus = total > 0 && this.totalGlobalRequests > 0
        ? Math.sqrt((2 * Math.log(this.totalGlobalRequests)) / total)
        : 1.0;

      const avgLatencyMs = total > 0 ? s.latencySumMs / total : 5000;
      const avgThroughput = total > 0 ? s.throughputSumTps / total : 0;

      const reliabilityScore = (successRate * 100) + this.config.explorationWeight * explorationBonus * 10;
      const latencyScore = Math.max(0, 100 - (avgLatencyMs / 100));
      const throughputScore = Math.min(100, avgThroughput / 10);
      const speedScore = (latencyScore * 0.6 + throughputScore * 0.4);
      const intelligenceScore = s.intelligenceTier === 1 ? 100 : s.intelligenceTier === 2 ? 66 : 33;
      const quotaScore = (1 - s.quotaUsed) * 100;

      const preferredBonus = c.isPreferred ? 20 : 0;

      const totalScore =
        this.config.reliabilityWeight * reliabilityScore +
        this.config.speedWeight * speedScore +
        this.config.intelligenceWeight * intelligenceScore +
        this.config.quotaWeight * quotaScore -
        this.config.penaltyWeight * Math.min(100, c.penaltyScore) +
        preferredBonus;

      return {
        modelKey: c.modelKey,
        providerId: c.providerId,
        modelId: c.modelId,
        totalScore,
        reliabilityScore,
        speedScore,
        intelligenceScore: intelligenceScore + (s.supportsReasoning ? this.config.reasoningBonus : 0),
        quotaScore,
        penaltyScore: c.penaltyScore,
        stats: { ...s },
        isPreferred: c.isPreferred,
      };
    });

    // Sort by total score descending
    scored.sort((a, b) => b.totalScore - a.totalScore);
    return scored;
  }

  /** Get stats for a model key */
  getStats(modelKey: string): Readonly<ModelStats> | undefined {
    return this.stats.get(modelKey);
  }

  /** Get all stats */
  getAllStats(): ReadonlyMap<string, ModelStats> {
    return this.stats;
  }

  /** Reset all stats */
  reset(): void {
    this.stats.clear();
    this.totalGlobalRequests = 0;
  }
}

// Global singleton
export const banditScorer = new BanditScorer();
