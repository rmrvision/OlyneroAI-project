# OlyneroAI
OlyneroAI is a Lovable-like app builder. Describe a landing or CRUD app and get a generated project, build, preview, and zip artifact.

> This repo is currently based on the PingCAP full-stack app builder agent and is being refit for Supabase + self-hosted runner in v0.1.

## Supabase Setup (v0.1)
Apply the initial schema and RLS policies:

1. Open Supabase Studio → **SQL Editor**.
2. Paste and run the SQL from `migrations/supabase/001_olyneroai_init.sql`.
3. Paste and run the SQL from `migrations/supabase/002_olyneroai_storage.sql` (creates the `artifacts` bucket).
4. Paste and run the SQL from `migrations/supabase/003_olyneroai_admin_profiles.sql` (admin flags + safer profile updates).

### Admin Bootstrap
Promote a user to admin by email (run in SQL Editor):

```sql
insert into public.profiles (id, email, display_name, role)
select id, email, coalesce(raw_user_meta_data->>'display_name', email), 'admin'
from auth.users
where email = 'admin@example.com'
on conflict (id) do update set role = 'admin';
```

## Environment Variables
Web app (public):
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser anon key for client auth.

Web app (server-only):
- `SUPABASE_SERVICE_ROLE_KEY`: service role key for admin/server-only operations.
- `RUNNER_SECRET`: shared secret used to sign runner requests and callbacks.
- `APP_ADMIN_EMAIL` (optional): reserved for future bootstrap flows.
- `APP_ADMIN_PASSWORD` (optional): reserved for future bootstrap flows.

Runner service:
- `RUNNER_SECRET`: must match the web app value.
- `RUNNER_PUBLIC_URL`: base URL used to build preview links.
- `RUNNER_NODE_IMAGE`: docker image for build containers (default: `node:20-slim`).
- `PORT`: runner port (default: `4010`).

## Runner (Docker Sandbox)
OlyneroAI uses a separate runner service to build generated apps safely.

### Why a separate runner
- Builds are isolated in Docker with CPU/RAM/time limits.
- The web app stays fast and secure (no local builds on the app server).
- Logs, preview URLs, and zip artifacts flow back via signed callbacks.

### What it does
- Receives a signed request with a spec (`landing` or `crud`).
- Generates code from templates.
- Runs `npm install` + `npm run build` inside Docker with CPU/RAM limits.
- Spins up a preview container (`npm run start`) and returns a preview URL.
- Produces a zip artifact and uploads it back to the app for storage in Supabase.

### How it works
1. The web app calls the runner `/runs` endpoint with an HMAC signature.
2. Runner streams logs and status updates to `/api/v1/runner/callback`.
3. Runner uploads the zip to `/api/v1/runner/artifact` for storage in Supabase.
4. Users download artifacts through `/api/v1/builds/:buildId/artifact` (owner/admin only).

### Runner setup
```bash
cd runner
npm install
RUNNER_SECRET=your-secret \
RUNNER_PUBLIC_URL=http://your-runner-host \
npm run start
```

### Runner environment
- `RUNNER_SECRET`: shared secret used to sign runner requests and callbacks.
- `RUNNER_PUBLIC_URL`: base URL of the runner for preview links (e.g. `http://runner.example.com`).
- `RUNNER_NODE_IMAGE`: docker image for build containers (default: `node:20-slim`).
- `PORT`: runner port (default: `4010`).

### Configure runner URL in Supabase
Set the runner URL in the `settings` table (SQL editor):
```sql
insert into public.settings (key, value)
values ('runner_url', '\"http://your-runner-host:4010\"'::jsonb)
on conflict (key) do update set value = excluded.value;
```

## Deployment

### A) Vercel
1. Create a new Vercel project from this repo.
2. Add environment variables:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RUNNER_SECRET`, `APP_ADMIN_EMAIL` (optional), `APP_ADMIN_PASSWORD` (optional).
3. Build command: `npm run build`
4. Output: default Next.js output (no custom output directory).
5. Deploy the runner separately (VPS) and set `settings.runner_url` in Supabase.

### B) Timeweb App
1. Create a new Node.js app from this repo.
2. Add environment variables (same list as Vercel).
3. Build command: `npm run build`
4. Start command: `npm run start`
5. Deploy the runner separately (VPS) and set `settings.runner_url` in Supabase.

## Local development
```bash
npm install
npm run dev
```

## Core npm Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Starts the App Router dev server with live reload. |
| `npm run build` / `npm run start` | Compile and serve the production bundle. |
| `npm run lint` | Run Biome lint rules (Next/React presets). |
| `npm run format` | Apply Biome formatting in-place. |
