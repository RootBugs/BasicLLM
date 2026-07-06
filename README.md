# BasicLLM

> **A lightweight, unified API gateway for routing requests to multiple LLM providers with built-in key management, rate limiting, and health monitoring.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-339933?logo=node.js)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js)](https://nextjs.org)

---

## Overview

BasicLLM is a minimal API gateway that provides a unified, OpenAI-compatible interface to multiple LLM providers. It handles authentication, rate limiting, request routing, and key management — so your applications can talk to any provider through a single endpoint.

---

## Features

- 🔑 **API Key Authentication** — Secure key-based access with JWT
- 🚦 **Rate Limiting** — Per-minute and per-hour limits per key
- 🔄 **Provider Routing** — Auto-route to the best available provider
- 🩺 **Health Monitoring** — Active endpoint health checks
- 📊 **Usage Statistics** — Track requests, tokens, and errors
- 📝 **Request Logging** — Structured logging with Pino
- 🐳 **Docker Support** — Ready-to-deploy multi-stage Docker build

---

## Quick Start

### Prerequisites
- Node.js >= 20
- Supabase account (for database and auth)
- At least one LLM provider API key

### Setup

```bash
# Clone the repository
git clone https://github.com/RootBugs/BasicLLM.git
cd BasicLLM

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials and API keys.

```bash
# Generate Prisma client and sync database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

---

## API Reference

All API requests require authentication via Bearer token.

### Chat Completions

```http
POST /api/v1/chat/completions
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "model": "gpt-4o",
  "messages": [{"role": "user", "content": "Hello!"}]
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/models` | List available models |
| POST | `/api/v1/chat/completions` | Chat completions (OpenAI-compatible) |
| POST | `/api/v1/embeddings` | Generate embeddings |
| POST | `/api/v1/analyze` | Analyze provider capabilities |
| GET | `/api/admin/keys` | List/manage API keys |
| GET | `/api/admin/stats` | View usage and quota stats |
| GET | `/api/admin/providers/health` | Provider health status |
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/register` | Admin registration |

---

## Supported Providers

- Google Gemini
- Groq
- OpenRouter
- Cerebras
- SambaNova
- Together AI
- Fireworks AI
- HuggingFace
- Cohere
- Ollama (local)
- vLLM (local)

---

## Deployment

### Using Docker

```bash
docker build -t basicllm .
docker run -p 3000:3000 --env-file .env.local basicllm
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | Supabase PostgreSQL URL |
| `SUPABASE_URL` | ✅ | — | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | — | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Supabase service role key |
| `JWT_SECRET` | ✅ | — | JWT secret (min 32 chars) |
| `ENCRYPTION_KEY` | ✅ | — | Encryption key (min 32 chars) |
| `GEMINI_API_KEY` | ❌ | — | Google Gemini key |
| `GROQ_API_KEY` | ❌ | — | Groq key |
| `OPENROUTER_API_KEY` | ❌ | — | OpenRouter key |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | ❌ | 60 | Request limit per minute |
| `RATE_LIMIT_REQUESTS_PER_HOUR` | ❌ | 1000 | Request limit per hour |

---

## Architecture

```
Client App → BasicLLM Gateway → LLM Provider
                  ↓
           [Auth / Rate Limit]
                  ↓
          [Provider Selector]
                  ↓
         [Response & Logging]
```

---

## Troubleshooting

### Common Issues

**1. Database connection errors**
- Ensure `DATABASE_URL` and `DIRECT_URL` are correct
- Check if Supabase project is active
- Verify network connectivity

**2. Provider API key errors**
- Ensure at least one provider API key is set
- Check key format (should start with provider prefix)
- Verify key hasn't been revoked

**3. Rate limiting issues**
- Check `RATE_LIMIT_REQUESTS_PER_MINUTE` setting
- Verify API key hasn't exceeded limits
- Check rate limit headers in response

**4. Session expired**
- Clear browser cookies
- Re-login to get new session
- Check `JWT_SECRET` is set correctly

### Debug Mode

Set `LOG_LEVEL=debug` in `.env.local` for verbose logging.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
