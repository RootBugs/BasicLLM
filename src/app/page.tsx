"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ── All 20+ Free Providers ────────────────────────────────────
const PROVIDERS = [
  { id: "google", name: "Gemini", provider: "Google", tier: "tier1", color: "#4285F4" },
  { id: "groq", name: "Groq", provider: "Groq Inc.", tier: "tier1", color: "#F97316" },
  { id: "openrouter", name: "OpenRouter", provider: "OpenRouter", tier: "tier1", color: "#8B5CF6" },
  { id: "cerebras", name: "Cerebras", provider: "Cerebras", tier: "tier1", color: "#06B6D4" },
  { id: "nvidia", name: "NVIDIA", provider: "NVIDIA", tier: "tier1", color: "#76B900" },
  { id: "github", name: "GitHub Models", provider: "GitHub", tier: "tier1", color: "#8B5CF6" },
  { id: "mistral", name: "Mistral", provider: "Mistral AI", tier: "tier2", color: "#FF7000" },
  { id: "cohere", name: "Cohere", provider: "Cohere", tier: "tier2", color: "#6366F1" },
  { id: "cloudflare", name: "Cloudflare", provider: "Cloudflare", tier: "tier2", color: "#F6821F" },
  { id: "huggingface", name: "HuggingFace", provider: "HF", tier: "tier2", color: "#FFD700" },
  { id: "moonshot", name: "Moonshot", provider: "Moonshot", tier: "tier2", color: "#6366F1" },
  { id: "together", name: "Together", provider: "Together", tier: "tier2", color: "#EC4899" },
  { id: "fireworks", name: "Fireworks", provider: "Fireworks", tier: "tier3", color: "#F43F5E" },
  { id: "zhipu", name: "Z.ai", provider: "Zhipu AI", tier: "tier3", color: "#3B82F6" },
  { id: "deepseek", name: "DeepSeek", provider: "DeepSeek", tier: "tier1", color: "#4F46E5" },
  { id: "ollama", name: "Ollama", provider: "Local", tier: "optional", color: "#14B8A6" },
  { id: "kilo", name: "Kilo", provider: "Kilo", tier: "tier2", color: "#F59E0B" },
  { id: "pollinations", name: "Pollinations", provider: "Pollinations", tier: "tier3", color: "#EC4899" },
  { id: "llm7", name: "LLM7", provider: "LLM7", tier: "tier3", color: "#8B5CF6" },
  { id: "opencode", name: "OpenCode", provider: "OpenCode", tier: "tier2", color: "#10B981" },
  { id: "ovh", name: "OVH", provider: "OVHcloud", tier: "tier3", color: "#0000FF" },
];

// ── Model Aliases from Prisma ──────────────────────────────────
const MODEL_ALIASES = [
  {
    id: "coder-fast",
    name: "Coder Fast",
    desc: "Optimized for speed — sub-500ms responses",
    providers: ["Groq", "Gemini", "Cerebras"],
    maxTokens: "4K",
  },
  {
    id: "coder-smart",
    name: "Coder Smart",
    desc: "Balanced speed & quality",
    providers: ["Groq", "Gemini", "OpenRouter"],
    maxTokens: "8K",
  },
  {
    id: "reasoning",
    name: "Reasoning",
    desc: "Deep reasoning with chain-of-thought",
    providers: ["Gemini", "OpenRouter", "Groq"],
    maxTokens: "16K",
  },
  {
    id: "architect",
    name: "Architect",
    desc: "High-level system design & planning",
    providers: ["OpenRouter", "Gemini", "Groq"],
    maxTokens: "32K",
  },
  {
    id: "deep-research",
    name: "Deep Research",
    desc: "Long-context research (128K tokens)",
    providers: ["Gemini", "OpenRouter"],
    maxTokens: "128K",
  },
];

// ── All Features from Prisma Schema ────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "UCB1 Bandit Routing",
    desc: "Routes every request using a multi-armed bandit algorithm — balances exploitation (best performers) with exploration (trying new models). Learns from every request, auto-adapts to provider changes, rate limits, and failures.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    title: "Circuit Breaker",
    desc: "Automatic failure detection with three circuit states — closed, open, half-open. Prevents cascading failures by isolating unhealthy providers and retrying with backoff.",
    gradient: "from-red-500 to-pink-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    title: "20+ Free AI Providers",
    desc: "Connect to Gemini, Groq, OpenRouter, Cerebras, NVIDIA, GitHub Models, Mistral, Cohere, Cloudflare, HuggingFace, Moonshot, Together, Fireworks, DeepSeek, Z.ai, Ollama, Kilo, Pollinations, LLM7, OpenCode, OVH, and custom endpoints — all free, all through one API.",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: "Model Aliases",
    desc: "Abstract behind semantic aliases — coder-fast, coder-smart, reasoning, architect, deep-research. Each alias has preferred and fallback providers with custom routing strategies.",
    gradient: "from-purple-500 to-violet-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
    title: "API Key Management",
    desc: "Create, revoke, and rename API keys with bcrypt hashing. Prefix-based identification, active/inactive states, and full audit trail of key usage.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Rate Limiting",
    desc: "Database-backed rate limiting per API key per time window (minute, hour, day). Tracks both request count and token count with automatic window reset.",
    gradient: "from-cyan-500 to-sky-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    title: "Request Logging & Audit",
    desc: "Complete audit trail of every API request — provider attempted, model used, tokens consumed, latency, status, error messages, and IP address. Perfect for debugging and billing.",
    gradient: "from-slate-500 to-gray-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    title: "Provider Health Monitoring",
    desc: "Real-time health tracking per provider — latency, success rate, error rate, consecutive failures. Integrated with circuit breaker for automatic provider isolation.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: "Session Stickiness",
    desc: "Lock conversations to specific providers for consistent behavior. Tracks session-to-provider mapping, model family, and auto-failover with switch counters.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    title: "Quota Management",
    desc: "Per-provider daily quota tracking with real-time remaining counters. Automatic quota reset and usage aggregation for informed routing decisions.",
    gradient: "from-yellow-500 to-amber-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "OpenAI-Compatible API",
    desc: "Drop-in replacement for OpenAI's chat completions and embeddings API. Uses the same request/response format — just change the base URL and you're done.",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: "Enterprise Security",
    desc: "Bcrypt-hashed API keys, JWT session tokens, HTTP-only cookies, encrypted provider credentials, and full RLS policies via Supabase.",
    gradient: "from-violet-500 to-purple-500",
  },
];

// ── Stats ──────────────────────────────────────────────────────
const STATS = [
  { label: "Free Providers", value: "20+" },
  { label: "Model Aliases", value: "5" },
  { label: "Routing", value: "UCB1 Bandit" },
  { label: "Latency", value: "<500ms" },
];

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) router.replace("/dashboard");
        else setChecking(false);
      })
      .catch(() => setChecking(false));

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-500">Loading BasicLLM...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* ── Background Effects ──────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/5 blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[40%] h-[40%] rounded-full bg-rose-500/3 blur-[100px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Navigation ─────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                <span className="text-white font-bold text-sm">Kw</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight">BasicLLM</span>
                <span className="text-[10px] text-zinc-500 -mt-0.5">AI API Gateway</span>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────── */}
      <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-4">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs sm:text-sm font-medium mb-6 sm:mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            OpenAI-compatible • 20+ free providers • UCB1 bandit routing
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 sm:mb-8 leading-[1.1]">
            <span className="gradient-text">One API</span>
            <br />
            <span>Twenty Free AI Providers</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            A drop-in OpenAI-compatible gateway with UCB1 bandit routing, circuit breakers,
            context handoff, and auto-failover — connecting you to 20+ free AI providers
            through a single API. Built for developers who code.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/register"
              className="group w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/50 hover:-translate-y-0.5 active:translate-y-0 text-base sm:text-lg inline-flex items-center justify-center gap-2"
            >
              Get started — it&apos;s free
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 border border-white/10 text-zinc-300 font-semibold rounded-xl hover:bg-white/5 hover:border-white/20 transition-all text-base sm:text-lg inline-flex items-center justify-center gap-2"
            >
              Explore features
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </a>
          </div>
        </div>

        {/* ── Provider Marquee ─────────────────────────── */}
        <div className="mt-16 sm:mt-20 max-w-7xl mx-auto px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-transparent to-[#0a0a0f] z-10 pointer-events-none" />
          <div className="overflow-hidden">
            <div className="flex gap-3 sm:gap-4 animate-scroll">
              {[...PROVIDERS, ...PROVIDERS].map((p, i) => (
                <div
                  key={`${p.id}-${i}`}
                  className="flex-shrink-0 flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}40` }}
                  />
                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-medium text-zinc-200">{p.name}</div>
                    <div className="text-[10px] sm:text-xs text-zinc-500">{p.provider}</div>
                  </div>
                  <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full ${
                    p.tier === "tier1" ? "bg-emerald-500/10 text-emerald-400" :
                    p.tier === "tier2" ? "bg-blue-500/10 text-blue-400" :
                    p.tier === "tier3" ? "bg-amber-500/10 text-amber-400" :
                    "bg-zinc-500/10 text-zinc-400"
                  }`}>
                    {p.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Code Snippet Section ───────────────────────── */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Drop-in OpenAI Replacement</h2>
            <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto">
              Change one line of code. Unlock 20+ free providers with smart bandit routing.
            </p>
          </div>
          <div className="code-block">
            <div className="code-block-header">
              <div className="flex gap-1.5">
                <span className="code-dot-red" />
                <span className="code-dot-yellow" />
                <span className="code-dot-green" />
              </div>
              <span className="text-xs text-zinc-500 ml-2">terminal</span>
            </div>
            <pre className="overflow-x-auto p-4 sm:p-6 text-xs sm:text-sm leading-relaxed text-zinc-300">
              <code>{`# Instead of this:
curl https://api.openai.com/v1/chat/completions \\
  -H "Authorization: Bearer $OPENAI_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Use this — BasicLLM routes to the best provider:
curl https://your-gateway.com/api/v1/chat/completions \\
  -H "Authorization: Bearer $BASICLLM_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "coder-fast",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── Stats Section ──────────────────────────────── */}
      <section className="py-12 sm:py-16 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-zinc-500 mt-1.5 group-hover:text-zinc-400 transition-colors">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Model Aliases ──────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Smart Model Aliases</h2>
            <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto">
              Abstract away provider complexity with purpose-built model aliases. Each alias 
              intelligently routes to the best provider for the job.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODEL_ALIASES.map((alias) => (
              <div
                key={alias.id}
                className="group p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/20 hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm sm:text-base text-zinc-200">{alias.name}</h3>
                  <span className="text-[10px] sm:text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                    {alias.maxTokens}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 mb-3 leading-relaxed">{alias.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {alias.providers.map((prov) => (
                    <span
                      key={prov}
                      className="text-[10px] sm:text-xs text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md"
                    >
                      {prov}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── All Features ───────────────────────────────── */}
      <section id="features" className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Everything You Need</h2>
            <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto">
              Enterprise-grade AI gateway with intelligent routing, monitoring, and security built in.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} bg-opacity-10 flex items-center justify-center mb-4 text-white shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 text-zinc-200 group-hover:text-white transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture Flow ──────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto">
              Every request passes through our intelligent routing pipeline.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                step: "01",
                title: "Request Inbound",
                desc: "Request hits the OpenAI-compatible endpoint with your API key and model alias.",
              },
              {
                step: "02",
                title: "Auth & Validation",
                desc: "API key is verified, rate limits checked, and request payload is validated against the schema.",
              },
              {
                step: "03",
                title: "Routing Engine",
                desc: "Scoring engine evaluates all healthy providers based on latency, quota, and priority weights.",
              },
              {
                step: "04",
                title: "Provider Execution",
                desc: "Request is sent to the best provider with automatic failover. Response is streamed back.",
              },
            ].map((step) => (
              <div key={step.step} className="relative p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-3xl sm:text-4xl font-bold text-white/5 mb-3">{step.step}</div>
                <h3 className="text-sm sm:text-base font-semibold mb-2 text-zinc-200">{step.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 relative overflow-hidden">
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px]" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[60px]" />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Ready to Unlock <span className="gradient-text">11 Providers</span>?
              </h2>
              <p className="text-zinc-400 text-sm sm:text-base mb-8 max-w-lg mx-auto">
                Create your account in seconds. Get your first API key instantly and start routing AI requests intelligently.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Link
                  href="/register"
                  className="group w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/50 inline-flex items-center justify-center gap-2"
                >
                  Create your account
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <a
                  href="#"
                  className="w-full sm:w-auto px-8 py-3.5 border border-white/10 text-zinc-300 font-semibold rounded-xl hover:bg-white/5 transition-all inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                  Self-host with Docker
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="py-10 sm:py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">Kw</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-zinc-200">BasicLLM</span>
                <span className="text-[10px] text-zinc-600 -mt-0.5">AI API Gateway</span>
              </div>
            </Link>
            <div className="flex items-center gap-5 sm:gap-6 text-xs sm:text-sm text-zinc-500">
              <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
              <Link href="/docs" className="hover:text-zinc-300 transition-colors">Docs</Link>
              <a href="https://github.com/basicllm/gateway" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-600">
              &copy; {new Date().getFullYear()} BasicLLM. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* ── Styles for marquee ─────────────────────────── */}
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          display: inline-flex;
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
