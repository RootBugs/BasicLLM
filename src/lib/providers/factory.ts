import { ProviderContract } from "./contract";
import { ProviderConfig, getProviderConfig } from "./config";
import { OpenAICompatibleAdapter } from "./openai-compatible/adapter";
import { HuggingFaceLegacyAdapter } from "./huggingface-legacy/adapter";
import logger from "@/lib/logger";

/**
 * Provider Adapter Factory
 * Creates the appropriate adapter based on provider ID and configuration.
 *
 * Architecture:
 * - 10 of 11 providers use OpenAICompatibleAdapter (native OpenAI endpoints)
 * - HuggingFace legacy uses HuggingFaceLegacyAdapter (fallback only)
 *
 * Factory is the ONLY place that knows about specific adapter implementations.
 * Routing engine and API routes only see ProviderContract interface.
 */

export function createProviderAdapter(providerId: string): ProviderContract {
  const config = getProviderConfig(providerId);

  if (!config) {
    logger.error({ providerId }, "Provider configuration not found");
    throw new Error(`Provider '${providerId}' not configured`);
  }

  // Check if API key is available
  const apiKey = process.env[config.apiKeyEnvVar];
  if (config.apiKeyEnvVar && (!apiKey || apiKey.length === 0)) {
    logger.warn({ providerId, envVar: config.apiKeyEnvVar }, "API key not configured");
  }

  // Select adapter based on provider
  switch (providerId) {
    case "huggingface-legacy":
      // Legacy HF inference API - native format, no streaming
      logger.info({ providerId }, "Using HuggingFaceLegacyAdapter");
      return new HuggingFaceLegacyAdapter(providerId, config);

    case "gemini":
    case "groq":
    case "openrouter":
    case "cerebras":
    case "sambanova":
    case "cohere":
    case "huggingface":
    case "together":
    case "fireworks":
    case "ollama":
    case "vllm":
    case "xiaomimimo":
      // All use native OpenAI-compatible endpoints
      logger.info({ providerId }, "Using OpenAICompatibleAdapter");
      return new OpenAICompatibleAdapter(providerId, config);

    default:
      logger.error({ providerId }, "Unknown provider, defaulting to OpenAICompatibleAdapter");
      return new OpenAICompatibleAdapter(providerId, config);
  }
}

/**
 * Get all available providers (have API keys configured)
 */
export function getAvailableProviders(): string[] {
  const configs = [
    "gemini", "groq", "openrouter", "cerebras", "sambanova",
    "cohere", "huggingface", "together", "fireworks", "ollama", "vllm", "xiaomimimo",
  ];

  return configs.filter(id => {
    const config = getProviderConfig(id);
    if (!config) return false;
    if (!config.apiKeyEnvVar) return true; // Local providers (ollama, vllm)
    const key = process.env[config.apiKeyEnvVar];
    return key && key.length > 0;
  });
}

/**
 * Check if provider is available (has API key)
 */
export function isProviderAvailable(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  if (!config) return false;
  if (!config.apiKeyEnvVar) return true; // Local providers
  const key = process.env[config.apiKeyEnvVar];
  return key !== undefined && key.length > 0;
}
