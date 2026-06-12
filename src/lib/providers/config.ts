// BasicLLM Provider Configuration — 20+ Free Coding-Optimized LLM Providers
// All providers use OpenAI-compatible endpoints (verified 2026-06)
// Focus: best FREE tier models for programming & coding tasks

export interface ProviderConfig {
  id: string;
  name: string;
  displayName: string;
  tier: "tier1" | "tier2" | "tier3" | "optional";
  baseUrl: string;
  apiKeyEnvVar: string;
  /** If true, no API key needed — provider is completely free */
  keyless: boolean;
  headers: Record<string, string>;
  extraHeaders?: Record<string, string>;
  modelMapping: Record<string, string>;
  supportsStreaming: boolean;
  maxRetries: number;
  timeoutMs: number;
  maxTokensPerRequest?: number;
  requestTransform?: (body: Record<string, unknown>) => Record<string, unknown>;
  responseTransform?: (data: unknown) => unknown;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  // ── TIER 1: Best Free Coding Models ──────────────────────
  google: {
    id: "google",
    name: "google",
    displayName: "Google Gemini",
    tier: "tier1",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKeyEnvVar: "GOOGLE_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "gemini-2.0-flash",
      "coder-smart": "gemini-2.5-flash",
      "reasoning": "gemini-2.5-pro",
      "architect": "gemini-2.5-pro",
      "deep-research": "gemini-2.5-pro",
    },
    supportsStreaming: true,
    maxRetries: 3,
    timeoutMs: 30000,
    maxTokensPerRequest: 1000000,
  },

  groq: {
    id: "groq",
    name: "groq",
    displayName: "Groq",
    tier: "tier1",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnvVar: "GROQ_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "llama-3.3-70b-versatile",
      "coder-smart": "qwen-3-32b",
      "reasoning": "qwen-3-32b",
      "architect": "llama-3.3-70b-versatile",
      "deep-research": "qwen-3-32b",
    },
    supportsStreaming: true,
    maxRetries: 3,
    timeoutMs: 15000,
    maxTokensPerRequest: 12000,
  },

  openrouter: {
    id: "openrouter",
    name: "openrouter",
    displayName: "OpenRouter",
    tier: "tier1",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnvVar: "OPENROUTER_API_KEYS",
    keyless: false,
    headers: {
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000",
      "X-Title": "BasicLLM",
    },
    modelMapping: {
      "coder-fast": "google/gemini-2.0-flash-001:free",
      "coder-smart": "qwen/qwen-2.5-coder-32b-instruct:free",
      "reasoning": "deepseek/deepseek-chat:free",
      "architect": "meta-llama/llama-3.3-70b-instruct:free",
      "deep-research": "google/gemini-2.0-flash-001:free",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 1000000,
    requestTransform: (body) => {
      if (body.max_tokens && typeof body.max_tokens === "number" && body.max_tokens < 16) {
        return { ...body, max_tokens: 16 };
      }
      return body;
    },
  },

  cerebras: {
    id: "cerebras",
    name: "cerebras",
    displayName: "Cerebras",
    tier: "tier1",
    baseUrl: "https://api.cerebras.ai/v1",
    apiKeyEnvVar: "CEREBRAS_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "llama3.1-70b",
      "coder-smart": "qwen-3-32b",
      "reasoning": "qwen-3-32b",
      "architect": "llama3.1-70b",
      "deep-research": "qwen-3-32b",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 20000,
    maxTokensPerRequest: 8000,
    // Cerebras drops unsupported params
    requestTransform: (body) => {
      const { frequency_penalty, logit_bias, presence_penalty, ...rest } = body;
      return rest;
    },
  },

  deepseek: {
    id: "deepseek",
    name: "deepseek",
    displayName: "DeepSeek",
    tier: "tier1",
    baseUrl: "https://api.deepseek.com",
    apiKeyEnvVar: "DEEPSEEK_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "deepseek-chat",
      "coder-smart": "deepseek-chat",
      "reasoning": "deepseek-reasoner",
      "architect": "deepseek-chat",
      "deep-research": "deepseek-reasoner",
    },
    supportsStreaming: true,
    maxRetries: 3,
    timeoutMs: 30000,
    maxTokensPerRequest: 65536,
  },

  github: {
    id: "github",
    name: "github",
    displayName: "GitHub Models",
    tier: "tier1",
    baseUrl: "https://models.inference.ai.azure.com",
    apiKeyEnvVar: "GITHUB_TOKEN",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "gpt-4o-mini",
      "coder-smart": "o4-mini",
      "reasoning": "o4-mini",
      "architect": "o4-mini",
      "deep-research": "gpt-4o",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 128000,
  },

  // ── TIER 2: Good Free Coding Models ─────────────────────
  nvidia: {
    id: "nvidia",
    name: "nvidia",
    displayName: "NVIDIA NIM",
    tier: "tier2",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    apiKeyEnvVar: "NVIDIA_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "meta/llama-3.3-70b-instruct",
      "coder-smart": "meta/llama-3.3-70b-instruct",
      "reasoning": "meta/llama-3.3-70b-instruct",
      "architect": "meta/llama-3.3-70b-instruct",
      "deep-research": "meta/llama-3.3-70b-instruct",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 131072,
  },

  mistral: {
    id: "mistral",
    name: "mistral",
    displayName: "Mistral AI",
    tier: "tier2",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyEnvVar: "MISTRAL_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "mistral-large-latest",
      "coder-smart": "mistral-large-latest",
      "reasoning": "mistral-large-latest",
      "architect": "mistral-large-latest",
      "deep-research": "mistral-large-latest",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 131072,
  },

  cloudflare: {
    id: "cloudflare",
    name: "cloudflare",
    displayName: "Cloudflare Workers AI",
    tier: "tier2",
    baseUrl: "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/v1",
    apiKeyEnvVar: "CLOUDFLARE_API_TOKEN",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "coder-smart": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "reasoning": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "architect": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "deep-research": "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 20000,
    maxTokensPerRequest: 32768,
  },

  moonshot: {
    id: "moonshot",
    name: "moonshot",
    displayName: "Moonshot (Kimi)",
    tier: "tier2",
    baseUrl: "https://api.moonshot.ai/v1",
    apiKeyEnvVar: "MOONSHOT_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "moonshot-v1-8k",
      "coder-smart": "moonshot-v1-32k",
      "reasoning": "moonshot-v1-32k",
      "architect": "moonshot-v1-32k",
      "deep-research": "moonshot-v1-128k",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 131072,
  },

  huggingface: {
    id: "huggingface",
    name: "huggingface",
    displayName: "HuggingFace Inference",
    tier: "tier2",
    baseUrl: "https://router.huggingface.co/v1",
    apiKeyEnvVar: "HUGGINGFACE_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "Qwen/Qwen2.5-Coder-32B-Instruct",
      "coder-smart": "Qwen/Qwen2.5-Coder-32B-Instruct",
      "reasoning": "deepseek-ai/DeepSeek-R1-0528",
      "architect": "Qwen/Qwen2.5-Coder-32B-Instruct",
      "deep-research": "deepseek-ai/DeepSeek-R1-0528",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 131072,
  },

  kilo: {
    id: "kilo",
    name: "kilo",
    displayName: "Kilo",
    tier: "tier2",
    baseUrl: "https://api.kilocode.ai/v1",
    apiKeyEnvVar: "",
    keyless: true,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "claude-sonnet-4",
      "coder-smart": "claude-sonnet-4",
      "reasoning": "claude-opus-4",
      "architect": "gemini-2.5-pro",
      "deep-research": "gemini-2.5-pro",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 200000,
  },

  opencode: {
    id: "opencode",
    name: "opencode",
    displayName: "OpenCode Zen",
    tier: "tier2",
    baseUrl: "https://opencode.ai/zen/v1",
    apiKeyEnvVar: "",
    keyless: true,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "zen/gpt-4o-mini",
      "coder-smart": "zen/gpt-4o",
      "reasoning": "zen/o4-mini",
      "architect": "zen/gpt-4o",
      "deep-research": "zen/gpt-4o",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 128000,
  },

  zhipu: {
    id: "zhipu",
    name: "zhipu",
    displayName: "Z.ai (GLM)",
    tier: "tier2",
    baseUrl: "https://open.bigmodel.cn/api/paas/v1",
    apiKeyEnvVar: "ZHIPU_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "glm-4-flash",
      "coder-smart": "glm-4-plus",
      "reasoning": "glm-4-plus",
      "architect": "glm-4-plus",
      "deep-research": "glm-4-plus",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 131072,
  },

  cohere: {
    id: "cohere",
    name: "cohere",
    displayName: "Cohere",
    tier: "tier2",
    baseUrl: "https://api.cohere.ai/v1",
    apiKeyEnvVar: "COHERE_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "command-r-plus",
      "coder-smart": "command-r-plus",
      "reasoning": "command-r-plus",
      "architect": "command-r-plus",
      "deep-research": "command-r-plus",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 20000,
    maxTokensPerRequest: 131072,
  },

  together: {
    id: "together",
    name: "together",
    displayName: "Together AI",
    tier: "tier2",
    baseUrl: "https://api.together.xyz/v1",
    apiKeyEnvVar: "TOGETHER_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      "coder-smart": "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      "reasoning": "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
      "architect": "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      "deep-research": "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 131072,
  },

  // ── TIER 3: Okay Free Models ────────────────────────────
  fireworks: {
    id: "fireworks",
    name: "fireworks",
    displayName: "Fireworks AI",
    tier: "tier3",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    apiKeyEnvVar: "FIREWORKS_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "accounts/fireworks/models/llama4-scout-17b-16e-instruct",
      "coder-smart": "accounts/fireworks/models/llama4-maverick-17b-128e-instruct",
      "reasoning": "accounts/fireworks/models/deepseek-v3p1",
      "architect": "accounts/fireworks/models/llama4-maverick-17b-128e-instruct",
      "deep-research": "accounts/fireworks/models/deepseek-v3p1",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 131072,
  },

  pollinations: {
    id: "pollinations",
    name: "pollinations",
    displayName: "Pollinations",
    tier: "tier3",
    baseUrl: "https://text.pollinations.ai/openai",
    apiKeyEnvVar: "",
    keyless: true,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "openai",
      "coder-smart": "openai-large",
      "reasoning": "openai-reasoning",
      "architect": "openai-large",
      "deep-research": "openai-large",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 128000,
  },

  llm7: {
    id: "llm7",
    name: "llm7",
    displayName: "LLM7",
    tier: "tier3",
    baseUrl: "https://api.llm7.com/v1",
    apiKeyEnvVar: "",
    keyless: true,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "llama-3.3-70b",
      "coder-smart": "claude-sonnet-4",
      "reasoning": "claude-opus-4",
      "architect": "claude-sonnet-4",
      "deep-research": "claude-opus-4",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 128000,
  },

  ovh: {
    id: "ovh",
    name: "ovh",
    displayName: "OVHcloud AI",
    tier: "tier3",
    baseUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net",
    apiKeyEnvVar: "",
    keyless: true,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "Meta-Llama-3.1-8B-Instruct",
      "coder-smart": "Meta-Llama-3.1-70B-Instruct",
      "reasoning": "Meta-Llama-3.1-70B-Instruct",
      "architect": "Meta-Llama-3.1-70B-Instruct",
      "deep-research": "Meta-Llama-3.1-70B-Instruct",
    },
    supportsStreaming: true,
    maxRetries: 2,
    timeoutMs: 30000,
    maxTokensPerRequest: 131072,
  },

  // ── OPTIONAL: Local Providers ──────────────────────────
  ollama: {
    id: "ollama",
    name: "ollama",
    displayName: "Ollama (Local)",
    tier: "optional",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
    apiKeyEnvVar: "",
    keyless: true,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "qwen2.5-coder",
      "coder-smart": "qwen2.5-coder:32b",
      "reasoning": "llama3.3:70b",
      "architect": "llama3.3:70b",
      "deep-research": "llama3.3:70b",
    },
    supportsStreaming: true,
    maxRetries: 1,
    timeoutMs: 60000,
  },

  vllm: {
    id: "vllm",
    name: "vllm",
    displayName: "vLLM (Local)",
    tier: "optional",
    baseUrl: process.env.VLLM_BASE_URL || "http://localhost:8000/v1",
    apiKeyEnvVar: "",
    keyless: true,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "default",
      "coder-smart": "default",
      "reasoning": "default",
      "architect": "default",
      "deep-research": "default",
    },
    supportsStreaming: true,
    maxRetries: 1,
    timeoutMs: 60000,
  },

  // ── CUSTOM: User-supplied endpoint ────────────────────
  custom: {
    id: "custom",
    name: "custom",
    displayName: "Custom Endpoint",
    tier: "optional",
    baseUrl: process.env.CUSTOM_ENDPOINT_URL || "http://localhost:8080/v1",
    apiKeyEnvVar: "CUSTOM_API_KEY",
    keyless: false,
    headers: { "Content-Type": "application/json" },
    modelMapping: {
      "coder-fast": "default",
      "coder-smart": "default",
      "reasoning": "default",
      "architect": "default",
      "deep-research": "default",
    },
    supportsStreaming: true,
    maxRetries: 1,
    timeoutMs: 60000,
  },
};

// ── Model Alias Definitions ─────────────────────────────────
// Each alias represents a "role" and maps to the best free model on each provider
export const MODEL_ALIASES: Record<string, {
  displayName: string;
  description: string;
  routingStrategy: "best_score" | "weighted" | "sticky";
  preferredProviders: string[];
  fallbackProviders: string[];
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}> = {
  "coder-fast": {
    displayName: "Coder Fast",
    description: "Optimized for speed — quick autocomplete, simple refactoring",
    routingStrategy: "best_score",
    preferredProviders: ["groq", "cerebras", "google", "kilo", "deepseek"],
    fallbackProviders: ["openrouter", "github", "nvidia", "pollinations"],
    maxTokens: 4096,
    temperature: 0.1,
  },
  "coder-smart": {
    displayName: "Coder Smart",
    description: "Balanced speed and quality — complex features, debugging",
    routingStrategy: "best_score",
    preferredProviders: ["google", "groq", "openrouter", "deepseek", "github"],
    fallbackProviders: ["cerebras", "moonshot", "huggingface", "kilo"],
    maxTokens: 8192,
    temperature: 0.2,
  },
  "reasoning": {
    displayName: "Reasoning",
    description: "Deep reasoning — algorithm design, complex problem solving",
    routingStrategy: "best_score",
    preferredProviders: ["google", "openrouter", "deepseek", "github"],
    fallbackProviders: ["groq", "huggingface", "together", "kilo"],
    maxTokens: 16384,
    temperature: 0.3,
  },
  "architect": {
    displayName: "Architect",
    description: "System design — project structure, tech decisions, architecture",
    routingStrategy: "best_score",
    preferredProviders: ["google", "openrouter", "github", "deepseek"],
    fallbackProviders: ["groq", "moonshot", "mistral", "kilo"],
    maxTokens: 32768,
    temperature: 0.4,
    systemPrompt: "You are a senior software architect. Focus on design patterns, scalability, and maintainability. Provide cleartrade-offs for each decision.",
  },
  "deep-research": {
    displayName: "Deep Research",
    description: "Long-context analysis — documentation, code review, research",
    routingStrategy: "best_score",
    preferredProviders: ["google", "openrouter", "moonshot", "github"],
    fallbackProviders: ["deepseek", "mistral", "opencode", "kilo"],
    maxTokens: 128000,
    temperature: 0.5,
    systemPrompt: "You are a research assistant. Provide thorough, well-structured analysis. Include citations and references where possible.",
  },
};

// System prompts per alias
export const SYSTEM_PROMPTS: Record<string, string> = {
  "coder-fast": "You are a fast coding assistant. Provide concise, accurate code responses. Focus on the task at hand.",
  "coder-smart": "You are an expert programmer. Write clean, efficient, well-documented code. Explain your reasoning briefly.",
  "reasoning": "You are a reasoning engine. Think step-by-step and explain your logic clearly.",
  "architect": "You are a senior software architect. Focus on design patterns, scalability, and maintainability.",
  "deep-research": "You are a research assistant. Provide thorough, well-structured analysis with citations where possible.",
};

// Model family mapping for context handoff detection
export const MODEL_FAMILIES: Record<string, string[]> = {
  // Gemini
  "gemini-2.0-flash": ["gemini"],
  "gemini-2.5-flash": ["gemini"],
  "gemini-2.5-pro": ["gemini"],
  "gemini-2.0-flash-001": ["gemini"],
  // Llama
  "llama-3.3-70b-versatile": ["llama"],
  "llama3.1-70b": ["llama"],
  "meta/llama-3.3-70b-instruct": ["llama"],
  "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free": ["llama"],
  "accounts/fireworks/models/llama4-scout-17b-16e-instruct": ["llama"],
  "accounts/fireworks/models/llama4-maverick-17b-128e-instruct": ["llama"],
  // Qwen
  "qwen-3-32b": ["qwen"],
  "qwen/qwen-2.5-coder-32b-instruct:free": ["qwen"],
  "Qwen/Qwen2.5-Coder-32B-Instruct": ["qwen"],
  // DeepSeek
  "deepseek-chat": ["deepseek"],
  "deepseek-reasoner": ["deepseek"],
  "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free": ["deepseek"],
  "deepseek-ai/DeepSeek-R1-0528": ["deepseek"],
  // OpenAI
  "gpt-4o-mini": ["gpt"],
  "gpt-4o": ["gpt"],
  "o4-mini": ["gpt"],
  // Claude (via Kilo/Pollinations)
  "claude-sonnet-4": ["claude"],
  "claude-opus-4": ["claude"],
  // Mistral
  "mistral-large-latest": ["mistral"],
  // GLM
  "glm-4-flash": ["glm"],
  "glm-4-plus": ["glm"],
  // Moonshot
  "moonshot-v1-8k": ["kimi"],
  "moonshot-v1-32k": ["kimi"],
  "moonshot-v1-128k": ["kimi"],
  // Cohere
  "command-r-plus": ["cohere"],
  // Cloudflare
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": ["llama"],
  "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b": ["deepseek"],
  // Custom/default
  "default": ["unknown"],
};

export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[providerId];
}

export function getModelAlias(alias: string) {
  return MODEL_ALIASES[alias];
}

export function getSystemPrompt(alias: string): string | undefined {
  return SYSTEM_PROMPTS[alias];
}

export function getModelFamily(modelId: string): string {
  const families = MODEL_FAMILIES[modelId];
  return families?.[0] || "unknown";
}

export function getAllProviderIds(): string[] {
  return Object.keys(PROVIDER_CONFIGS);
}

export function getActiveProviderIds(): string[] {
  const isProduction = process.env.NODE_ENV === "production";
  return Object.entries(PROVIDER_CONFIGS)
    .filter(([_, config]) => {
      // Keyless providers are always active
      if (config.keyless) return true;
      // Local providers only in dev
      if (!config.apiKeyEnvVar || config.apiKeyEnvVar.length === 0) {
        return !isProduction;
      }
      // Check env vars (support comma-separated keys)
      const raw = process.env[config.apiKeyEnvVar] || process.env[config.apiKeyEnvVar.replace("_KEYS", "_KEY")] || "";
      const hasKey = raw.split(",").some(k => k.trim().length > 0);
      return hasKey;
    })
    .map(([id]) => id);
}

export function getProvidersByFamily(family: string): string[] {
  return Object.entries(PROVIDER_CONFIGS)
    .filter(([_, config]) => {
      return Object.values(config.modelMapping).some(modelId => {
        const families = MODEL_FAMILIES[modelId];
        return families?.includes(family);
      });
    })
    .map(([id]) => id);
}
