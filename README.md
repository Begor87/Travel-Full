# Wanderlog

**Your personal travel operating system.**

A production-grade, full-stack travel management platform built for personal use, family trips, and collaborative travel planning. Offline-first, self-hostable, and AI-assisted.

---

## Features

| Module | Capabilities |
|---|---|
| **Trips** | Create, plan, share, duplicate, and archive trips with destinations, tags, cover images |
| **Itinerary** | Multi-day event timeline with categories, booking refs, checklists, reminders |
| **Conflict Detection** | Automatic detection of overlapping events and tight transfers |
| **Collaboration** | Invite editors/viewers, real-time presence via WebSocket, activity log |
| **Budget** | Trip budgets, expense tracking, per-person splits, category breakdown |
| **AI Assistant** | Itinerary optimisation, gap analysis, activity suggestions, packing lists |
| **Offline-First** | IndexedDB caching, sync queue, graceful reconnection |
| **PWA** | Installable, works offline, background sync via Service Worker |
| **Documents** | Vault for tickets, passports, visas, insurance (architecture ready) |
| **Dark Mode** | Full light/dark/system theme support |

---

## Tech Stack

**Frontend** — `apps/web`
- React 18 + TypeScript + Vite
- TailwindCSS (calm, card-based design system)
- Zustand (auth, UI, sync state)
- TanStack Query (server state + caching)
- React Router v6
- Leaflet + OpenStreetMap (no API key required)
- Vite PWA (service worker + workbox)
- IndexedDB (offline persistence)

**Backend** — `apps/api`
- Node.js + TypeScript + Express
- Prisma ORM + PostgreSQL
- JWT auth with refresh token rotation
- WebSocket server (real-time collaboration)
- Modular router/service architecture

**Shared** — `packages/shared`
- Zod validation schemas
- TypeScript types shared across frontend and backend

---

## Quick Start (Development)

### Prerequisites
- Node.js 20+
- pnpm 9+ (`corepack enable` or install via install script)
- Docker (for PostgreSQL)

### 1. Start the database

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — JWT secrets are pre-filled for development
```

### 4. Run database migrations and seed

```bash
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run migrations
pnpm db:seed      # Create demo data (optional)
```

### 5. Start development servers

```bash
pnpm dev
```

This starts:
- API: http://localhost:3001
- Web: http://localhost:5173

### Demo credentials (after seeding)
- Email: `demo@wanderlog.app`
- Password: `Demo1234!`

---

## Production Deployment (Docker)

```bash
cp apps/api/.env.example .env
# Edit .env — set strong JWT secrets, OPENAI_API_KEY, etc.

docker compose up -d
```

The stack runs:
- `wanderlog-postgres` — PostgreSQL 16
- `wanderlog-api` — Node.js API on port 3001
- `wanderlog-web` — Nginx + React SPA on port 3000

---

## Project Structure

```
wanderlog/
├── apps/
│   ├── api/                    # Express + Prisma backend
│   │   ├── src/
│   │   │   ├── modules/        # auth, trips, itinerary, budget, ai...
│   │   │   ├── shared/         # middleware, errors, utils
│   │   │   ├── services/       # websocket, storage, email
│   │   │   └── database/       # Prisma client
│   │   └── prisma/             # Schema + migrations + seed
│   └── web/                    # React frontend
│       └── src/
│           ├── app/            # Router, providers, guards
│           ├── modules/        # Feature modules (trips, itinerary, ai...)
│           ├── shared/         # UI components, hooks, utils
│           ├── services/       # API client, offline DB, sync engine
│           └── store/          # Zustand stores
├── packages/
│   └── shared/                 # Shared types + Zod schemas
└── docker/                     # Dockerfiles + nginx config
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Access token signing secret |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token signing secret |
| `OPENAI_API_KEY` | Optional | Enables AI features |
| `CORS_ORIGIN` | Dev | Frontend URL for CORS |
| `STORAGE_PROVIDER` | Optional | `local` (default) or `s3` |
| `EMAIL_PROVIDER` | Optional | `console` (default) or `smtp` |

---

## Architecture Notes

### Offline-First
The app uses IndexedDB (`offlineDB`) to cache trips and itineraries locally. When offline, writes are queued in a sync queue and flushed via `syncEngine.flushSyncQueue()` on reconnection. The `OnlineStatusProvider` listens to browser online/offline events and shows appropriate toasts.

### Real-Time Collaboration
The WebSocket server (`services/websocket.ts`) manages trip subscriptions. When a trip is updated, the API broadcasts events to all connected collaborators. The frontend `wsClient` handles reconnection with exponential backoff.

### AI Integration
All AI calls go through the `AiProvider` interface in `modules/ai/ai.service.ts`. Currently implements OpenAI but the interface is provider-agnostic. Set `AI_PROVIDER=openai` and `OPENAI_API_KEY` to enable. Without it, AI endpoints return a graceful "unavailable" message.

### Security
- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens (15min) + refresh token rotation (30 days)
- Refresh tokens stored in database and revoked on use
- Rate limiting on all API routes
- Helmet.js security headers
- CORS restricted to configured origin

---

## Roadmap

- [ ] Map view with Leaflet route visualisation
- [ ] Document vault with PDF preview
- [ ] Global search with full-text indexing
- [ ] Calendar view integration
- [ ] Push notification support
- [ ] OAuth (Google/GitHub) login
- [ ] Export to PDF / calendar format
- [ ] Multi-currency conversion
- [ ] MFA / passkey support
