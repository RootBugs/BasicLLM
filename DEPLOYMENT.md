# Deployment Guide

## Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

## Docker

```bash
# Build
docker build -t basicllm .

# Run
docker run -d \
  --name basicllm \
  -p 3000:3000 \
  --env-file .env.local \
  basicllm
```

## Docker Compose

```bash
docker-compose up -d
```

## Environment Variables

See `.env.example` for required variables.

## Database Setup

1. Create Supabase project
2. Run migration SQL
3. Set `DATABASE_URL` and `DIRECT_URL`

## Post-Deployment

1. Verify health: `curl http://localhost:3000/api/health`
2. Test API: `curl -H "Authorization: Bearer sk-team-xxx" http://localhost:3000/v1/models`
3. Check dashboard: `http://localhost:3000/dashboard`
