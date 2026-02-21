# Olynero Runner

A docker-based sandbox runner that builds generated projects and returns logs,
preview URLs, and a zip artifact.

## Requirements
- Docker installed and running.
- Node.js 20+.

## Environment
- `RUNNER_SECRET` (required): shared secret with the web app.
- `RUNNER_PUBLIC_URL` (optional): base URL for preview links (default: http://localhost).
- `RUNNER_NODE_IMAGE` (optional): docker image for builds (default: node:20-slim).
- `PORT` (optional): runner port (default: 4010).

## Run
```bash
npm install
npm run start
```

## Health
`GET /health` should return `{ ok: true }`.
