# Changelog

## v1.1.0 (2026-07-06)

### Features

- **validation**: add SessionIdSchema for UUID validation
- **validation**: add HealthCheckSchema and response type
- **validation**: add barrel export for schemas
- **monitoring**: add in-memory request metrics cache
- **monitoring**: add exportToCsv utility for data export
- **routing**: add ProviderConfig interface
- **auth**: add refreshSession function
- **api**: add health check endpoint
- **api**: add v2 rewrite for future API versioning
- **crypto**: add formatError helper for consistent error messages
- **scripts**: add database backup utility

### Bug Fixes

- **rate-limiter**: add server time reference for clock skew
- **middleware**: handle empty session cookies

### Performance

- **api-keys**: use select instead of include for better query performance

### Refactoring

- **cleanup**: add dryRun parameter for safe testing

### Documentation

- add troubleshooting section to README
- add DEPLOYMENT.md guide

### Chores

- add .env.test.example for test configuration
- add .eslintrc.json with strict rules
- add docker-compose.yml with PostgreSQL

## v1.0.0 (2026-07-02)

### Features

- Initial release
- UCB1 bandit routing engine
- 20+ provider integrations
- Circuit breaker with 3 states
- Session stickiness
- API key management
- Rate limiting
- Request logging
- Provider health monitoring
- Dashboard with real-time stats
- OpenAI-compatible API
- Docker support
- Vercel deployment support
