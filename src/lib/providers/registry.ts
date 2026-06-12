// BasicLLM Provider Registry — 20+ Free Coding-Optimized LLM Providers
// Each provider defines its models, capabilities, and request transforms

export type ModelCapability = "tools" | "vision" | "reasoning" | "audio" | "video";

export interface ModelDef {
  id: string; // e.g. "gemini-2.0-flash"
  name: string; // display name
  contextWindow: number;
  maxOutput: number;
  capabilities: ModelCapability[];
  free: true; // all models here are free tier
  tier: 1 | 2 | 3; // 1=best, 2=good, 3=okay for coding
  reasoning?: boolean;
}

export interface ProviderDef {
  id: string;
  name: string;
  baseURL: string;
  apiKeyEnvVar?: string; // env var name for API key
  keyless: boolean; // true = no API key needed
  color: string;
  models: ModelDef[];
  // Request transform: modify the outgoing request for this provider
  transformRequest?: (body: Record<string, unknown>) => Record<string, unknown>;
  // Response transform: normalize provider response to OpenAI format
  transformResponse?: (body: unknown) => unknown;
  // SSE stream transform: parse provider-specific SSE chunks
  parseStream?: (line: string) => string | null; // returns null to skip
}

export interface ModelAlias {
  id: string;
  name: string;
  description: string;
  temperature: number;
  systemPrompt: string;
  preferredProviders: string[]; // ordered by preference
  fallbackProviders: string[];
  maxTokens: number;
  minTier: 1 | 2 | 3;
  contextPreference: "short" | "medium" | "long";
  strategyPrefix: string; // model IDs starting with this get priority
}

// ─── PROVIDERS ───────────────────────────────────────────

export const PROVIDERS: ProviderDef[] = [
  // ── Keyless Providers (no API key needed) ──
  {
    id: "kilo",
    name: "Kilo",
    baseURL: "https://api.kilocode.ai/v1",
    keyless: true,
    color: "#8B5CF6",
    models: [
      { id: "claude-sonnet-4", name: "Claude Sonnet 4", contextWindow: 200000, maxOutput: 8192, capabilities: ["tools", "vision", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "claude-opus-4", name: "Claude Opus 4", contextWindow: 200000, maxOutput: 8192, capabilities: ["tools", "vision", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000, maxOutput: 8192, capabilities: ["tools", "vision", "reasoning"], free: true, tier: 1, reasoning: true },
    ],
  },
  {
    id: "pollinations",
    name: "Pollinations",
    baseURL: "https://text.pollinations.ai/openai",
    keyless: true,
    color: "#EC4899",
    models: [
      { id: "openai", name: "GPT-4o-mini", contextWindow: 128000, maxOutput: 16384, capabilities: ["tools", "vision"], free: true, tier: 2 },
      { id: "openai-large", name: "GPT-4o", contextWindow: 128000, maxOutput: 16384, capabilities: ["tools", "vision"], free: true, tier: 1 },
      { id: "openai-reasoning", name: "o3-mini", contextWindow: 200000, maxOutput: 100000, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "llama", name: "Llama 3.3 70B", contextWindow: 128000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 2 },
      { id: "deepseek", name: "DeepSeek V3", contextWindow: 64000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 2 },
      { id: "deepseek-r1", name: "DeepSeek R1", contextWindow: 64000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "qwen-coder", name: "Qwen 2.5 Coder 32B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "claude", name: "Claude 3.5 Sonnet", contextWindow: 200000, maxOutput: 8192, capabilities: ["tools", "vision", "reasoning"], free: true, tier: 1 },
    ],
  },
  {
    id: "opencode",
    name: "OpenCode Zen",
    baseURL: "https://opencode.ai/zen/v1",
    keyless: true,
    color: "#F59E0B",
    models: [
      { id: "zen/gpt-4.1-nano", name: "GPT-4.1 Nano", contextWindow: 128000, maxOutput: 16384, capabilities: ["tools", "vision"], free: true, tier: 1 },
      { id: "zen/google/gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000, maxOutput: 8192, capabilities: ["tools", "vision", "reasoning"], free: true, tier: 1 },
      { id: "zen/gpt-4.1-mini", name: "GPT-4.1 Mini", contextWindow: 128000, maxOutput: 16384, capabilities: ["tools", "vision"], free: true, tier: 1 },
    ],
  },
  {
    id: "ovh",
    name: "OVH AI Endpoints",
    baseURL: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
    keyless: true,
    color: "#000F9C",
    models: [
      { id: "llama-3.3-70b-instruct", name: "Meta Llama 3.3 70B", contextWindow: 128000, maxOutput: 4096, capabilities: ["tools"], free: true, tier: 2 },
    ],
  },
  {
    id: "llm7",
    name: "LLM7",
    baseURL: "https://api.llm7.com/v1",
    keyless: false, // uses per-key rate limits
    apiKeyEnvVar: "LLM7_API_KEY",
    color: "#3B82F6",
    models: [
      { id: "free-70b", name: "Free 70B Model", contextWindow: 32000, maxOutput: 4096, capabilities: ["tools"], free: true, tier: 2 },
    ],
  },

  // ── API Key Providers ──
  {
    id: "google",
    name: "Google AI Studio",
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyEnvVar: "GOOGLE_API_KEY",
    keyless: false,
    color: "#4285F4",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1000000, maxOutput: 8192, capabilities: ["tools", "vision", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "gemini-2.5-flash-preview-05-20", name: "Gemini 2.5 Flash", contextWindow: 1000000, maxOutput: 8192, capabilities: ["tools", "vision", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "gemini-2.5-pro-preview-05-06", name: "Gemini 2.5 Pro", contextWindow: 1000000, maxOutput: 8192, capabilities: ["tools", "vision", "reasoning"], free: true, tier: 1, reasoning: true },
    ],
    transformRequest: (body) => {
      // Google needs a different format — handled by adapter
      return body;
    },
  },
  {
    id: "groq",
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKeyEnvVar: "GROQ_API_KEY",
    keyless: false,
    color: "#F97316",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "qwen-qwq-32b", name: "Qwen QWQ 32B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 2 },
    ],
  },
  {
    id: "cerebras",
    name: "Cerebras",
    baseURL: "https://api.cerebras.ai/v1",
    apiKeyEnvVar: "CEREBRAS_API_KEY",
    keyless: false,
    color: "#06B6D4",
    models: [
      { id: "llama3.1-70b", name: "Llama 3.1 70B", contextWindow: 32768, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "llama3.1-8b", name: "Llama 3.1 8B", contextWindow: 32768, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 2 },
      { id: "qwen-3-32b", name: "Qwen 3 32B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
    ],
    transformRequest: (body) => {
      // Cerebras drops unsupported params
      const { ...rest } = body as Record<string, unknown>;
      delete rest["logit_bias"];
      delete rest["response_format"];
      return rest;
    },
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    keyless: false,
    color: "#A855F7",
    models: [
      { id: "google/gemini-2.0-flash-001:free", name: "Gemini 2.0 Flash (Free)", contextWindow: 1000000, maxOutput: 8192, capabilities: ["tools", "vision", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "deepseek/deepseek-chat:free", name: "DeepSeek V3 (Free)", contextWindow: 64000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B (Free)", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "nousresearch/hermes-3-llama-3.1-70b:free", name: "Hermes 3 70B (Free)", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 2 },
      { id: "anthropic/claude-3.5-sonnet:free", name: "Claude 3.5 Sonnet (Free)", contextWindow: 200000, maxOutput: 8192, capabilities: ["tools", "vision", "reasoning"], free: true, tier: 1 },
    ],
  },
  {
    id: "github",
    name: "GitHub Models",
    baseURL: "https://models.inference.ai.azure.com",
    apiKeyEnvVar: "GITHUB_TOKEN",
    keyless: false,
    color: "#8B5CF6",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, maxOutput: 16384, capabilities: ["tools", "vision"], free: true, tier: 1 },
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, maxOutput: 16384, capabilities: ["tools", "vision"], free: true, tier: 1 },
      { id: "o4-mini", name: "o4-mini", contextWindow: 200000, maxOutput: 100000, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "llama-3.3-70b-instruct", name: "Llama 3.3 70B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "deepseek-r1", name: "DeepSeek R1", contextWindow: 64000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
    ],
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKeyEnvVar: "NVIDIA_API_KEY",
    keyless: false,
    color: "#76B900",
    models: [
      { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "qwen/qwen3-32b", name: "Qwen 3 32B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    baseURL: "https://api.mistral.ai/v1",
    apiKeyEnvVar: "MISTRAL_API_KEY",
    keyless: false,
    color: "#FF7000",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large 2", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "codestral-latest", name: "Codestral", contextWindow: 32768, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    baseURL: "https://api.cohere.com/v1",
    apiKeyEnvVar: "COHERE_API_KEY",
    keyless: false,
    color: "#39594D",
    models: [
      { id: "command-r-plus", name: "Command R+", contextWindow: 131000, maxOutput: 4096, capabilities: ["tools"], free: true, tier: 1 },
      { id: "command-r", name: "Command R", contextWindow: 131000, maxOutput: 4096, capabilities: ["tools"], free: true, tier: 2 },
    ],
    transformRequest: (body) => {
      // Cohere needs history-first ordering — handled by adapter
      return body;
    },
  },
  {
    id: "huggingface",
    name: "HuggingFace",
    baseURL: "https://api-inference.huggingface.co/v1",
    apiKeyEnvVar: "HF_TOKEN",
    keyless: false,
    color: "#FFD21E",
    models: [
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder 32B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "Qwen/Qwen3-32B", name: "Qwen 3 32B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B", name: "DeepSeek R1 70B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
    ],
  },
  {
    id: "moonshot",
    name: "Moonshot (Kimi)",
    baseURL: "https://api.moonshot.ai/v1",
    apiKeyEnvVar: "MOONSHOT_API_KEY",
    keyless: false,
    color: "#2563EB",
    models: [
      { id: "moonshot-v1-8k", name: "Moonshot v1 8K", contextWindow: 8192, maxOutput: 4096, capabilities: ["tools"], free: true, tier: 2 },
      { id: "moonshot-v1-32k", name: "Moonshot v1 32K", contextWindow: 32768, maxOutput: 4096, capabilities: ["tools"], free: true, tier: 2 },
    ],
  },
  {
    id: "together",
    name: "Together AI",
    baseURL: "https://api.together.xyz/v1",
    apiKeyEnvVar: "TOGETHER_API_KEY",
    keyless: false,
    color: "#000000",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B Turbo", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder 32B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
    ],
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    baseURL: "https://api.fireworks.ai/inference/v1",
    apiKeyEnvVar: "FIREWORKS_API_KEY",
    keyless: false,
    color: "#FF4500",
    models: [
      { id: "accounts/fireworks/models/llama-v3p3-70b-instruct", name: "Llama 3.3 70B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "accounts/fireworks/models/qwen2p5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "accounts/fireworks/models/deepseek-r1", name: "DeepSeek R1", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    apiKeyEnvVar: "DEEPSEEK_API_KEY",
    keyless: false,
    color: "#4B6DE5",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3", contextWindow: 64000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindow: 64000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    baseURL: "http://localhost:11434/v1",
    keyless: true,
    color: "#14B8A6",
    models: [
      { id: "llama3.3", name: "Llama 3.3 70B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "qwen2.5-coder:32b", name: "Qwen 2.5 Coder 32B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 1 },
      { id: "deepseek-r1:70b", name: "DeepSeek R1 70B", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools", "reasoning"], free: true, tier: 1, reasoning: true },
      { id: "codellama:70b", name: "CodeLlama 70B", contextWindow: 16384, maxOutput: 4096, capabilities: ["tools"], free: true, tier: 2 },
    ],
  },
  {
    id: "zhipu",
    name: "Z.ai (GLM)",
    baseURL: "https://open.bigmodel.cn/api/paas/v1",
    apiKeyEnvVar: "ZHIPU_API_KEY",
    keyless: false,
    color: "#00A0E9",
    models: [
      { id: "glm-4-flash", name: "GLM-4 Flash", contextWindow: 131000, maxOutput: 4096, capabilities: [], free: true, tier: 2 },
      { id: "glm-4-plus", name: "GLM-4 Plus", contextWindow: 131000, maxOutput: 4096, capabilities: ["tools", "vision"], free: true, tier: 1 },
    ],
  },
  {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    baseURL: "", // set via env or user config
    apiKeyEnvVar: "CUSTOM_API_KEY",
    keyless: false,
    color: "#6B7280",
    models: [
      { id: "custom", name: "Custom Model", contextWindow: 131000, maxOutput: 8192, capabilities: ["tools"], free: true, tier: 2 },
    ],
  },
];

// ─── CODING MODEL ALIASES ────────────────────────────────

export const MODEL_ALIASES: ModelAlias[] = [
  {
    id: "coder-fast",
    name: "Coder Fast",
    description: "Ultra-fast coding responses. Optimized for speed — sub-500ms.",
    temperature: 0.1,
    systemPrompt: "You are an expert coding assistant. Provide concise, correct code. Prioritize speed and accuracy. No unnecessary explanations.",
    preferredProviders: ["groq", "cerebras", "kilo", "opencode"],
    fallbackProviders: ["github", "ollama", "together", "fireworks", "deepseek", "openrouter", "pollinations"],
    maxTokens: 4096,
    minTier: 2,
    contextPreference: "short",
    strategyPrefix: "",
  },
  {
    id: "coder-smart",
    name: "Coder Smart",
    description: "Best balance of speed and quality for coding.",
    temperature: 0.2,
    systemPrompt: "You are an expert senior software engineer. Write clean, efficient, well-structured code. Explain briefly when helpful. Consider edge cases.",
    preferredProviders: ["kilo", "github", "groq", "openrouter", "cerebras"],
    fallbackProviders: ["nvidia", "together", "fireworks", "deepseek", "huggingface", "google", "pollinations"],
    maxTokens: 8192,
    minTier: 2,
    contextPreference: "medium",
    strategyPrefix: "",
  },
  {
    id: "reasoning",
    name: "Reasoning",
    description: "Deep chain-of-thought reasoning for complex problems.",
    temperature: 0.3,
    systemPrompt: "You are a world-class reasoning engine. Think step by step. Break down complex problems. Verify your logic. Be thorough and precise.",
    preferredProviders: ["kilo", "groq", "github", "deepseek", "huggingface"],
    fallbackProviders: ["openrouter", "together", "fireworks", "nvidia", "google", "pollinations"],
    maxTokens: 16384,
    minTier: 2,
    contextPreference: "medium",
    strategyPrefix: "",
  },
  {
    id: "architect",
    name: "Architect",
    description: "System design, architecture decisions, and planning.",
    temperature: 0.4,
    systemPrompt: "You are a principal software architect. Help design systems, choose technologies, plan implementations. Think about scalability, maintainability, and trade-offs. Provide clear diagrams and structured plans.",
    preferredProviders: ["kilo", "github", "groq", "openrouter"],
    fallbackProviders: ["deepseek", "huggingface", "nvidia", "together", "fireworks", "google", "pollinations"],
    maxTokens: 32768,
    minTier: 2,
    contextPreference: "long",
    strategyPrefix: "",
  },
  {
    id: "deep-research",
    name: "Deep Research",
    description: "Long-context research and analysis (128K tokens).",
    temperature: 0.5,
    systemPrompt: "You are a research assistant with deep analytical capabilities. Thoroughly analyze topics, synthesize information from multiple perspectives, cite sources when relevant, and provide comprehensive answers.",
    preferredProviders: ["kilo", "groq", "openrouter", "openai"],
    fallbackProviders: ["google", "github", "nvidia", "huggingface", "together", "pollinations"],
    maxTokens: 32768,
    minTier: 2,
    contextPreference: "long",
    strategyPrefix: "",
  },
];

// ─── HELPER FUNCTIONS ────────────────────────────────────

export function getAllModels(): Array<ModelDef & { providerId: string; providerName: string }> {
  const models: Array<ModelDef & { providerId: string; providerName: string }> = [];
  for (const provider of PROVIDERS) {
    for (const model of provider.models) {
      models.push({ ...model, providerId: provider.id, providerName: provider.name });
    }
  }
  return models;
}

export function getProvider(id: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getModel(providerId: string, modelId: string): ModelDef | undefined {
  const provider = getProvider(providerId);
  if (!provider) return undefined;
  return provider.models.find((m) => m.id === modelId);
}

export function getAlias(aliasId: string): ModelAlias | undefined {
  return MODEL_ALIASES.find((a) => a.id === aliasId);
}

export function resolveAlias(aliasId: string): ModelAlias | undefined {
  // Check if it's an alias first
  const alias = getAlias(aliasId);
  if (alias) return alias;
  return undefined;
}

/** Get all provider+model candidates for a given alias, ordered by preference */
export function getCandidatesForAlias(aliasId: string): Array<{
  provider: ProviderDef;
  model: ModelDef;
  score: number;
  isPreferred: boolean;
}> {
  const alias = getAlias(aliasId);
  if (!alias) return [];

  const candidates: Array<{ provider: ProviderDef; model: ModelDef; score: number; isPreferred: boolean }> = [];

  // Preferred providers first
  for (const providerId of alias.preferredProviders) {
    const provider = getProvider(providerId);
    if (!provider) continue;
    for (const model of provider.models) {
      if (!model.free) continue;
      if (model.tier > alias.minTier + 1) continue; // allow slightly lower tier
      if (alias.strategyPrefix && !model.id.startsWith(alias.strategyPrefix)) {
        // Prefer models matching the strategy but don't exclude others
      }
      candidates.push({ provider, model, score: 100 - model.tier * 10, isPreferred: true });
    }
  }

  // Fallback providers
  for (const providerId of alias.fallbackProviders) {
    const provider = getProvider(providerId);
    if (!provider) continue;
    for (const model of provider.models) {
      if (!model.free) continue;
      if (model.tier > alias.minTier + 1) continue;
      // Avoid duplicates
      if (candidates.some((c) => c.provider.id === provider.id && c.model.id === model.id)) continue;
      candidates.push({ provider, model, score: 50 - model.tier * 10, isPreferred: false });
    }
  }

  return candidates;
}

/** Keyless provider IDs */
export const KEYLESS_PROVIDERS = PROVIDERS.filter((p) => p.keyless).map((p) => p.id);

/** Provider IDs that need API keys */
export const KEYED_PROVIDERS = PROVIDERS.filter((p) => !p.keyless).map((p) => p.id);
