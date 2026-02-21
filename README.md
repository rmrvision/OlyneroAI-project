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

## What This Agent Can Do
- Generate complete web apps from a prompt (Next.js 16 + shadcn/Tailwind).
- Provision TiDB Cloud clusters/branches per project and per instruction.
- Track versions so code, schema, and credentials stay aligned.
- Run and preview apps instantly via Vercel sandboxes and previews.
- Keep conversational context between generations for iterative refinement.
- Scale down idle environments with TiDB Cloud serverless.

## Architecture Overview

<p align="center">
  <img alt="Architecture Overview: OlyneroAI" src="./public/architecture.png" width="960" />
</p>

- **Server actions** (`src/actions/*`) orchestrate GitHub, TiDB Cloud, and Vercel resources.
- **Sandboxes** (`src/sandboxes/*`) launch per-task runtimes, run `npm run dev`, and report via `src/app/hooks/v1/sandboxes/[sandboxId]/route.ts`.
- **Session UI** (`src/app/(customer)/s/[slug]`) streams logs, checkpoints, and deploy links.
- **Auth & protection** (`src/proxy.ts`, `src/lib/auth*`) gate `/projects`, `/settings`, and API v1 routes.

## How It Works (End-to-End)
<p align="center">
  <img alt="End-to-end user flow: prompt to plan, provision, generate, migrate, deploy, and iterate" src="./public/userflow.png" width="960" />
</p>

1. **Prompt** – “Build a todo app.”  
2. **Plan** – Model drafts an execution plan.  
3. **Provision** – Create TiDB cluster/branch, Vercel sandbox, GitHub repo/branch, and env vars.  
4. **Generate** – Codex/Claude Code writes app code, Kysely schema, and migrations.  
5. **Migrate** – Run typed migrations against the TiDB branch.  
6. **Deploy** – Commit to GitHub and trigger a Vercel preview.  
7. **Iterate** – Follow-up prompts (e.g., “Add a username field”) spawn new TiDB branches and code revisions, keeping everything reversible.

## Magic Features
- **Checkpointed versions** – Git branches map to TiDB branches for perfect code–data sync.
  ```ts
  // TiDB Cloud branch creation (simplified)
  import fetch from "node-fetch";

  async function createBranch(clusterId, displayName, publicKey, privateKey) {
    const res = await fetch(
      `https://serverless.tidbapi.com/v1beta1/clusters/${clusterId}/branches`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " + Buffer.from(`${publicKey}:${privateKey}`).toString("base64"),
        },
        body: JSON.stringify({ displayName }),
      },
    );
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()).branchId;
  }
  ```
- **Type-safe migrations** – Kysely migrations keep schema evolution safe and reversible.
  ```ts
  import type { Kysely } from "kysely";

  export async function up(db: Kysely<any>) {
    await db.schema
      .alterTable("todo_list")
      .addColumn("username", "varchar(255)", (col) => col.notNull().defaultTo(""))
      .execute();
  }

  export async function down(db: Kysely<any>) {
    await db.schema.alterTable("todo_list").dropColumn("username").execute();
  }
  ```
- **Scale-to-zero** – TiDB Cloud automatically scales down to $0 when idle, enabling ephemeral AI-generated apps, on-demand dev envs, branch-per-instruction workflows, and bursty agent workloads without persistent costs.

## Directory Layout
| Path | Purpose |
| --- | --- |
| `src/app/(auth)` | Credential login flow rendered via `LoginForm`. |
| `src/app/(main)` | Internal dashboard (project list, per-project GitHub/Vercel cards, task tables, dialogs). |
| `src/app/(customer)/s/[slug]` | Session replay UI backed by `getSessionData`. |
| `src/app/api` | Versioned REST hooks for projects, tasks, revisions, sandboxes, TiDB Cloud branches, Vercel resources, and debug message streams. |
| `src/actions` | Server actions encapsulating provisioning logic for projects, tasks, revisions, Vercel sandboxes, and TiDB Cloud branches. |
| `src/lib` | Auth, DB, TiDB Cloud client, user setting validators, AI model helpers, utility types, and `generateSessionId`. |
| `src/sandboxes` | Helpers that orchestrate `@vercel/sandbox` lifecycle (install tools, resume sessions from Blob storage, enforce trusted runtimes). |
| `migrations` | Kysely migrations plus schema evolution for `user`, `project`, `task`, `task_revision`, `tidbcloud_branch`, `vercel_sandbox`, and `ui_session`. |
| `scripts` | Local DX helpers (`migrate.ts`, `setup-local-user.js`, `gen-password.js`). |

## Prerequisites & Environment
- Node.js 18.18+ (Next.js 16 requirement) and npm.
- TiDB Serverless account with API keys, organization/project IDs, region, and database endpoint.
- GitHub account with access to install the required template and push commits via Personal Access Token.
- Vercel team token with Blob Storage enabled.
- OpenAI (or CRS) API key to drive Codex sessions.
- Required environment variables:
  - `DATABASE_URL`
  - `OPENAI_API_KEY`
  - `TIDB_CLOUD_REGION`, `TIDB_CLOUD_DATABASE_ENDPOINT`

## Setup
```bash
npm install

# Bootstrap TiDB schema (creates the schema + tables and regenerates typed bindings)
npm run migrate:init       # one-time schema creation
npm run migrate:up         # run pending migrations

# Create your first local operator seeded with GitHub + password credentials
node scripts/setup-local-user.js
# (Use scripts/gen-password.js if you only need to hash a password with BCRYPT_SALT)

# Launch the workspace
npm run dev
```
Visit `http://localhost:3000/login`, authenticate with the user you just created, and start creating projects or sessions.

## Core npm Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Starts the App Router dev server with live reload. |
| `npm run build` / `npm run start` | Compile and serve the production bundle. |
| `npm run lint` | Run Biome lint rules (Next/React presets). |
| `npm run format` | Apply Biome formatting in-place. |
| `npm run migrate:init|up|down` | Execute the TiDB schema bootstrap/migration workflow in `scripts/migrate.ts` and regenerate `src/lib/db/schema.d.ts`. |
| `npm run install-shadcn-components` | Re-sync shadcn/ui components based on `components.json`. |
# OlyneroAI-project
