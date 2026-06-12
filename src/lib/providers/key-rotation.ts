import logger from "@/lib/logger";

// ============================================================================
// Multi-Key Rotation Manager
// ============================================================================
// Supports multiple API keys per provider with round-robin rotation.
// Automatically skips failed keys and retries with next available key.
// Specifically handles 429 rate limits by immediately rotating to next key.
// ============================================================================

interface KeyEntry {
  key: string;
  index: number;
  failedAt?: number;     // Timestamp of last failure
  failCount: number;     // Consecutive failure count
  lastUsedAt?: number;   // Timestamp of last use
  totalRequests: number; // Total requests with this key
  totalFailures: number; // Total failures with this key
}

// Cooldown period after a key fails (60 seconds)
const KEY_COOLDOWN_MS = 60_000;
// Max consecutive failures before a key is considered dead
const MAX_FAILURES = 3;
// Max force-resets before refusing to retry (prevents infinite loop on quota exhaustion)
const MAX_FORCE_RESETS = 2;

class KeyRotationManager {
  private providers = new Map<string, KeyEntry[]>();
  private currentIndex = new Map<string, number>();
  private forceResetCounts = new Map<string, number>();

  /**
   * Initialize keys for a provider from comma-separated env var or single key.
   * Supports both GEMINI_API_KEY (single) and GEMINI_API_KEYS (comma-separated).
   */
  initProvider(providerId: string, envVarName: string): void {
    if (this.providers.has(providerId)) return;

    // Try plural first (GEMINI_API_KEYS), then singular (GEMINI_API_KEY)
    const raw = process.env[envVarName] || process.env[envVarName.replace("_KEYS", "_KEY")] || "";
    const keys = [...new Set(
      raw.split(",")
        .map(k => k.trim())
        .filter(k => k.length > 0)
    )];

    if (keys.length === 0) {
      logger.warn({ providerId, envVar: envVarName }, "No API keys found for provider");
      this.providers.set(providerId, []);
      return;
    }

    const entries: KeyEntry[] = keys.map((key, index) => ({
      key,
      index,
      failCount: 0,
      totalRequests: 0,
      totalFailures: 0,
    }));

    this.providers.set(providerId, entries);
    this.currentIndex.set(providerId, 0);

    logger.info({ providerId, keyCount: keys.length }, "Provider keys initialized");
  }

  /**
   * Get the next available key for a provider (round-robin).
   * Skips keys that are in cooldown due to recent failures.
   */
getNextKey(providerId: string): string | null {
    const keys = this.providers.get(providerId);
    if (!keys || keys.length === 0) return null;

    const now = Date.now();
    const startIdx = this.currentIndex.get(providerId) || 0;

    // Try all keys starting from current index
    for (let i = 0; i < keys.length; i++) {
      const idx = (startIdx + i) % keys.length;
      const entry = keys[idx];

      // Check if key is in cooldown
      if (entry.failedAt && now - entry.failedAt < KEY_COOLDOWN_MS) {
        continue; // Skip this key, try next
      }

      // Reset fail count if cooldown expired
      if (entry.failedAt && now - entry.failedAt >= KEY_COOLDOWN_MS) {
        entry.failCount = 0;
        entry.failedAt = undefined;
      }

      // Move index for next call
      this.currentIndex.set(providerId, (idx + 1) % keys.length);
      return entry.key;
    }

    // All keys are in cooldown — check if we've already force-reset too many times
    const forceResetCount = this.forceResetCounts.get(providerId) || 0;

    if (forceResetCount >= MAX_FORCE_RESETS) {
      // Provider is truly exhausted (e.g., daily quota hit). Don't keep retrying.
      logger.warn(
        { providerId, forceResetCount },
        "All keys exhausted and max force-resets reached — provider unavailable"
      );
      return null;
    }

    // Force reset the oldest failed key
    const oldestFailed = keys.reduce((oldest, curr) => {
      if (!curr.failedAt) return curr;
      if (!oldest.failedAt) return oldest;
      return curr.failedAt < oldest.failedAt ? curr : oldest;
    });

    oldestFailed.failCount = 0;
    oldestFailed.failedAt = undefined;
    this.forceResetCounts.set(providerId, forceResetCount + 1);
    this.currentIndex.set(providerId, (oldestFailed.index + 1) % keys.length);

    logger.warn(
      { providerId, forceResetCount: forceResetCount + 1 },
      "All keys in cooldown, forcing reset of oldest key"
    );
    return oldestFailed.key;
  }

  /**
   * Report a key failure (increments fail count, triggers cooldown).
   * On 429 rate limit, immediately puts key in cooldown.
   */
  reportFailure(providerId: string, key: string, isRateLimit: boolean = false): void {
    const keys = this.providers.get(providerId);
    if (!keys) return;

    const entry = keys.find(e => e.key === key);
    if (!entry) return;

    entry.failCount++;
    entry.totalFailures++;
    entry.failedAt = Date.now();

    if (isRateLimit) {
      // 429 = immediate cooldown (don't waste retries on this key)
      logger.warn(
        { providerId, keyIndex: entry.index, keyPrefix: key.substring(0, 12) + "..." },
        "Key rate-limited (429), immediate cooldown"
      );
    } else if (entry.failCount >= MAX_FAILURES) {
      logger.warn(
        { providerId, keyIndex: entry.index, failCount: entry.failCount },
        "Key marked as dead (max failures reached)"
      );
    }
  }

  /**
   * Report a key success (resets fail count).
   */
  reportSuccess(providerId: string, key: string): void {
    const keys = this.providers.get(providerId);
    if (!keys) return;

    const entry = keys.find(e => e.key === key);
    if (!entry) return;

    entry.failCount = 0;
    entry.failedAt = undefined;
    entry.lastUsedAt = Date.now();
    entry.totalRequests++;

    // Reset force-reset counter on success (provider recovered)
    this.forceResetCounts.set(providerId, 0);
  }

  /**
   * Get status of all keys for a provider.
   */
  getKeyStatus(providerId: string): Array<{
    index: number;
    isActive: boolean;
    failCount: number;
    maskedKey: string;
    totalRequests: number;
    totalFailures: number;
  }> {
    const keys = this.providers.get(providerId);
    if (!keys) return [];

    const now = Date.now();
    return keys.map(entry => ({
      index: entry.index,
      isActive: !entry.failedAt || now - entry.failedAt >= KEY_COOLDOWN_MS,
      failCount: entry.failCount,
      maskedKey: entry.key.substring(0, 12) + "..." + entry.key.substring(entry.key.length - 4),
      totalRequests: entry.totalRequests,
      totalFailures: entry.totalFailures,
    }));
  }

  /**
   * Get total key count for a provider.
   */
  getKeyCount(providerId: string): number {
    return this.providers.get(providerId)?.length || 0;
  }

  /**
   * Get status for ALL providers.
   */
  getAllProviderStatus(): Record<string, {
    keyCount: number;
    activeKeys: number;
    keys: Array<{
      index: number;
      isActive: boolean;
      failCount: number;
      maskedKey: string;
    }>;
  }> {
    const result: Record<string, any> = {};

    for (const [providerId, keys] of this.providers) {
      const now = Date.now();
      const activeKeys = keys.filter(k => !k.failedAt || now - k.failedAt >= KEY_COOLDOWN_MS);

      result[providerId] = {
        keyCount: keys.length,
        activeKeys: activeKeys.length,
        keys: keys.map(entry => ({
          index: entry.index,
          isActive: !entry.failedAt || now - entry.failedAt >= KEY_COOLDOWN_MS,
          failCount: entry.failCount,
          maskedKey: entry.key.substring(0, 12) + "..." + entry.key.substring(entry.key.length - 4),
        })),
      };
    }

    return result;
  }
}

// Singleton instance
const rotationManager = new KeyRotationManager();

// Auto-initialize known providers on import
const KNOWN_PROVIDERS: Array<{ id: string; envVar: string }> = [
  { id: "openrouter", envVar: "OPENROUTER_API_KEYS" },
  { id: "gemini", envVar: "GEMINI_API_KEY" },
  { id: "groq", envVar: "GROQ_API_KEY" },
  { id: "cerebras", envVar: "CEREBRAS_API_KEY" },
  { id: "sambanova", envVar: "SAMBANOVA_API_KEY" },
  { id: "cohere", envVar: "COHERE_API_KEY" },
  { id: "huggingface", envVar: "HUGGINGFACE_API_KEY" },
  { id: "together", envVar: "TOGETHER_API_KEY" },
  { id: "fireworks", envVar: "FIREWORKS_API_KEY" },
  { id: "xiaomimimo", envVar: "XIAOMIMIMO_API_KEY" },
];

for (const p of KNOWN_PROVIDERS) {
  rotationManager.initProvider(p.id, p.envVar);
}

export default rotationManager;
