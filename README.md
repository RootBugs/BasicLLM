<div align="center">

# 🚀 BasicLLM

**One OpenAI-compatible endpoint. 21+ free LLM providers. Zero cost.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#-features) • [Providers](#-providers) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [API](#-api-reference)

</div>

---

## ✨ Features

- **21+ Free LLM Providers** — All accessible through a single OpenAI-compatible API
- **Smart Routing Engine** — UCB1 Multi-Armed Bandit algorithm picks the best provider per request
- **Circuit Breaker** — Automatic failover with closed/open/half-open states (60s cooldown, 5-failure threshold)
- **Session Stickiness** — Conversations stay on the same provider (max 3 switches)
- **Context Handoff** — On failover, recent history is summarized and passed to the new provider
- **Tool Call Rescue** — Supports 5 tool-call dialects (Kimi/DeepSeek tokens, Qwen/Hermes XML, Llama/Groq XML, bare JSON, markdown)
- **Multi-Key Rotation** — Multiple API keys per provider with cooldown on failure
- **Request Optimization** — 5-stage pipeline for optimal request formatting
- **Real-time Dashboard** — Provider health, usage stats, latency charts
- **API Key Management** — User-generated API keys for gateway access
- **Streaming + Non-streaming** — Full SSE support for chat completions
- **Embeddings** — OpenAI-compatible embeddings endpoint
- **Model Aliases** — `coder-fast`, `coder-smart`, `reasoning`, `architect`, `deep-research`

---

## 🤖 Providers (21+)

### Tier 1 — Fast & Reliable
| Provider | Base URL | Auth |
|----------|----------|------|
| Google Gemini | `generativelanguage.googleapis.com/v1beta/openai/` | `GEMINI_API_KEY` |
| Groq | `api.groq.com/openai/v1` | `GROQ_API_KEY` |
| OpenRouter | `openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |
| Cerebras | `api.cerebras.ai/v1` | `CEREBRAS_API_KEY` |
| DeepSeek | `api.deepseek.com/v1` | `DEEPSEEK_API_KEY` |
| GitHub Models | `models.inference.ai.azure.com` | `GITHUB_TOKEN` |

### Tier 2 — High Quality
| Provider | Base URL | Auth |
|----------|----------|------|
| NVIDIA NIM | `integrate.api.nvidia.com/v1` | `NVIDIA_API_KEY` |
| Mistral | `api.mistral.ai/v1` | `MISTRAL_API_KEY` |
| Cloudflare | `api.cloudflare.com/client/v4/accounts/.../ai/v1` | `CLOUDFLARE_API_KEY` |
| Moonshot | `api.moonshot.ai/v1` | `MOONSHOT_API_KEY` |
| HuggingFace | `router.huggingface.co/v1` | `HF_TOKEN` |
| Kilo | `api.kilo.ai/v1` | `KILO_API_KEY` |
| OpenCode Zen | `api.opencode.ai/v1` | `OPENCODE_API_KEY` |
| Z.ai | `api.z.ai/v1` | `ZAI_API_KEY` |
| Cohere | `api.cohere.ai/compatibility/v1` | `COHERE_API_KEY` |
| Together AI | `api.together.xyz/v1` | `TOGETHER_API_KEY` |

### Tier 3 — Specialized
| Provider | Base URL | Auth |
|----------|----------|------|
| Fireworks AI | `api.fireworks.ai/inference/v1` | `FIREWORKS_API_KEY` |
| Pollinations | `text.pollinations.ai/openai` | None |
| LLM7 | `api.llm7.io/v1` | `LLM7_API_KEY` |
| OVHcloud AI | `api.ovhcloud.com/v1` | `OVH_API_KEY` |

### Local / Self-Hosted
| Provider | Base URL | Auth |
|----------|----------|------|
| Ollama | `localhost:11434/v1` | None |
| vLLM | `localhost:8000/v1` | None |
| Custom Endpoint | User-defined | Optional |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Any OpenAI SDK)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /v1/chat/completions
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BasicLLM Gateway                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Auth Layer   │  │ Rate Limiter │  │ Request Optimizer │  │
│  │ (API Key /   │  │ (per-key     │  │ (5-stage          │  │
│  │  Session)    │  │  sliding win)│  │  pipeline)        │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬──────────┘  │
│         └────────────────┼────────────────────┘             │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Routing Engine (UCB1 Bandit)             │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  │   │
│  │  │ Circuit     │  │ Session     │  │ Multi-Key    │  │   │
│  │  │ Breaker     │  │ Stickiness  │  │ Rotation     │  │   │
│  │  └────────────┘  └─────────────┘  └──────────────┘  │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Provider Adapters (OpenAI-Compatible)       │   │
│  │  Gemini │ Groq │ OpenRouter │ Cerebras │ DeepSeek │   │   │
│  │  NVIDIA │ Mistral │ Cloudflare │ Cohere │ Together │   │   │
│  │  Fireworks │ Pollinations │ Ollama │ vLLM │ Custom │   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                             │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Supabase  │  │ Prisma ORM   │  │ SQLite (dev)       │    │
│  │ (Prod)    │  │              │  │ PostgreSQL (prod)  │    │
│  └──────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack
- **Frontend:** Next.js 15, React 19, Tailwind CSS, Recharts
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** Supabase (PostgreSQL) for production, SQLite for dev
- **Auth:** bcryptjs, jose (JWT), session cookies
- **Monitoring:** Pino logger, request logging, provider health checks

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20
- npm / pnpm / bun
- Supabase project (for production)

### 1. Clone & Install
```bash
git clone https://github.com/RootBugs/BasicLLM.git
cd BasicLLM
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Database
DATABASE_URL="file:./dev.db"          # SQLite for local dev
# Or for Supabase:
# DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# Supabase (optional, for auth)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Provider API Keys (add the ones you want to use)
GEMINI_API_KEY=your-key
GROQ_API_KEY=your-key
OPENROUTER_API_KEY=your-key
DEEPSEEK_API_KEY=your-key
# ... add more as needed

# App
NEXTAUTH_SECRET=your-secret-key
```

### 3. Database Setup
```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:seed        # Seed initial data
```

### 4. Run
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 📡 API Reference

### Chat Completions
```http
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "model": "coder-fast",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "stream": true
}
```

### Models List
```http
GET /v1/models
Authorization: Bearer YOUR_API_KEY
```

### Embeddings
```http
POST /v1/embeddings
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "model": "text-embedding-3-small",
  "input": "Hello world"
}
```

### Analyze
```http
POST /v1/analyze
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "text": "Analyze this text..."
}
```

### Auth
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Current user |
| `/api/auth/accept-terms` | POST | Accept ToS |

### Admin
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/stats` | GET | Usage statistics |
| `/api/admin/keys` | GET | List API keys |
| `/api/admin/keys` | POST | Create API key |
| `/api/admin/keys/[id]/revoke` | POST | Revoke key |
| `/api/admin/keys/[id]/rename` | POST | Rename key |
| `/api/admin/providers/health` | GET | Provider health |

---

## 📁 Project Structure

```
BasicLLM/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── v1/            # OpenAI-compatible endpoints
│   │   │   ├── auth/          # Authentication
│   │   │   ├── admin/         # Admin panel APIs
│   │   │   └── cron/          # Scheduled tasks
│   │   ├── dashboard/         # Dashboard UI
│   │   ├── docs/              # Documentation page
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   └── terms/             # Terms of service
│   └── lib/                   # Core libraries
│       ├── providers/         # Provider adapters & routing
│       ├── auth/              # Auth middleware
│       ├── db/                # Database clients
│       ├── analysis/          # Token analysis
│       └── monitoring/        # Request logging
├── prisma/                     # Database schema
├── docs/                       # Documentation
├── scripts/                    # Utility scripts
├── reference/                  # Reference materials
├── review/                     # Code review notes
└── supabase/                   # Supabase config
```

---

## 🤝 Contributing

This is an open-source project. Feel free to fork, modify, and use it however you want.

---

## 📄 License

MIT License — use it, break it, ship it. No strings attached.

---

<div align="center">

**Built with ❤️ by [RootBugs](https://github.com/RootBugs)**

⭐ Star this repo if it helps you!

</div>
