# Deployment guide

Run the full Ledger-Core stack (Postgres, Redis, API, web) in Docker for the hackathon demo.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- `server/.env` filled in (see [Environment variables](#environment-variables))

---

## Architecture

`docker-compose.prod.yml` builds and runs four containers on one Docker network:

| Service    | Built from          | Exposed on             |
|------------|----------------------|-------------------------|
| `postgres` | `postgres:16-alpine` | `localhost:5432`        |
| `redis`    | `redis:7-alpine`     | `localhost:6379`        |
| `api`      | `server/Dockerfile`   | `localhost:3050`        |
| `web`      | `frontend/Dockerfile` | `localhost:8080`        |

The `api` container waits for `postgres` and `redis` to report healthy before starting, then runs migrations automatically before the server boots (see `server/docker-entrypoint.sh`). The `web` container waits for `api` to report healthy before starting.

Both `api` and `web` images define a `HEALTHCHECK` (polling `/health` and `/` respectively) so `docker compose ps` and `depends_on: condition: service_healthy` reflect real readiness, not just "the process started."

The `api` container runs as the non-root `node` user (built into the `node:alpine` base image). `web` keeps nginx's default privilege handling — nginx's master process needs root briefly to bind port 80, then drops privileges for its worker processes internally.

Containers reach each other by service name on the internal Docker network — `api` connects to the database at `postgres:5432`, not `localhost:5432`. This is set automatically in `docker-compose.prod.yml` and does not need to be in `server/.env`.

---

## Environment variables

Copy the template and fill in real values:

```bash
cp server/.env.example server/.env
```

| Variable | Used by | Notes |
|----------|---------|-------|
| `PORT` | api | Defaults to `3050` |
| `JWT_SECRET` | api | Secret — do not commit |
| `NOMBA_ENV` | api | `sandbox` for the hackathon |
| `NOMBA_API_BASE_URL` | api | Nomba sandbox base URL |
| `NOMBA_PARENT_ACCOUNT_ID` | api | From Nomba dashboard |
| `NOMBA_SUB_ACCOUNT_ID` | api | From Nomba dashboard |
| `NOMBA_CLIENT_ID` | api | Secret — do not commit |
| `NOMBA_CLIENT_SECRET` | api | Secret — do not commit |
| `NOMBA_WEBHOOK_SECRET` | api | Secret — used to verify inbound webhooks |
| `NOMBA_WEBHOOK_PATH` | api | Defaults to `/webhooks/nomba` |

`DATABASE_URL` and `REDIS_URL` in `server/.env` are used for **local (non-Docker) development only**. When running via `docker-compose.prod.yml`, the compose file overrides both to point at the `postgres` and `redis` containers — leave them as-is in `.env`.

Optional, set in your shell or a root `.env` file before running compose:

| Variable | Default | Purpose |
|----------|---------|---------|
| `POSTGRES_USER` | `user` | Postgres container credentials |
| `POSTGRES_PASSWORD` | `password` | Postgres container credentials |
| `POSTGRES_DB` | `ledger_core` | Postgres database name |
| `VITE_API_URL` | `http://localhost:3050` | Baked into the web build at build time — the URL the dashboard calls |

**Never commit `server/.env`.** It is already gitignored.

---

## Run the full stack

From the repo root:

```bash
npm run docker:prod:up
```

This builds the `api` and `web` images and starts all four containers in the background. First build takes a few minutes; rebuilds are faster due to layer caching.

Check status:

```bash
docker compose -f docker-compose.prod.yml ps
```

Wait until `postgres` and `redis` show `healthy`, then `api` and `web` should be `running`.

View logs:

```bash
docker compose -f docker-compose.prod.yml logs -f api
```

---

## Verify

```bash
curl http://localhost:3050/health
```

Expected: `{"status":"ok"}`

Open `http://localhost:8080` in a browser for the dashboard.

Migrations run automatically on `api` container start. To load demo seed data:

```bash
docker compose -f docker-compose.prod.yml exec api npm run seed
```

---

## Stop / reset

```bash
npm run docker:prod:down        # stop and remove containers, keep data
docker compose -f docker-compose.prod.yml down -v   # also wipe database data
```

---

## Troubleshooting

**`api` exits immediately on startup**

- Check logs: `docker compose -f docker-compose.prod.yml logs api`
- Usually a missing required env var in `server/.env` (see `server/config/env.ts` for the full required list) — the container will fail fast with `Missing required environment variable: X`.

**`api` can't reach the database**

- Confirm `postgres` shows `healthy`: `docker compose -f docker-compose.prod.yml ps`
- `DATABASE_URL` inside the container should resolve to `postgres`, not `localhost` — this is set by `docker-compose.prod.yml`, not `server/.env`.

**Port already in use**

- Another process is bound to `3050`, `8080`, `5432`, or `6379`. Stop it, or change the host-side port mapping in `docker-compose.prod.yml`.

**Rebuilding after a code change**

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
