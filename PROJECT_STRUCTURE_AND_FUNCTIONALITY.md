# Portfolio Project - Structure and Functionality Guide

This repository contains two separate applications:

- `portfolio_26`: frontend (Vue 3 + Vite + Pinia)
- `portolio_26_be`: backend API (Fastify + Drizzle ORM)

Note: backend folder name currently uses `portolio` (missing `f`).

## 1. High-Level Architecture

Frontend communicates with backend REST APIs under `/api`.

Main user flow:

1. Frontend loads public catalog (`/tracks`, `/releases`).
2. User selects a track.
3. Frontend requests a short-lived signed playback URL (`/playback/authorize`).
4. Audio element streams media from `/playback/media/*` with signature + expiry.

Admin flow:

1. Frontend stores an access code in `localStorage`.
2. Frontend sends it in `X-Access-Code` header for API calls.
3. Backend allows admin access if header matches `ADMIN_PASSWORD`.
4. Backend also supports session-cookie auth (`/auth/login`, `/auth/logout`, `/auth/me`).

## 2. Repository Structure

```text
patriziomilione.com/
├─ portfolio_26/                 # Frontend app
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ player/
│  │  │  │  ├─ ExpandedPlayer.vue
│  │  │  │  └─ MiniPlayer.vue
│  │  │  ├─ AppHeader.vue
│  │  │  ├─ MusicSection.vue
│  │  │  ├─ AdminSection.vue     # present but not used by App.vue currently
│  │  │  ├─ BioSection.vue       # present but not used by App.vue currently
│  │  │  └─ LyricsSection.vue    # present but not used by App.vue currently
│  │  ├─ lib/
│  │  │  ├─ api.js               # API client
│  │  │  └─ translations.js      # i18n messages + locale helpers
│  │  ├─ stores/
│  │  │  ├─ auth.js              # frontend access-code state
│  │  │  └─ player.js            # playback/queue state
│  │  ├─ App.vue                 # main page composition + admin UI + audio logic
│  │  ├─ main.js                 # app bootstrap
│  │  └─ styles.css
│  ├─ .env.example
│  ├─ package.json
│  └─ vite.config.js
│
└─ portolio_26_be/               # Backend app
   ├─ src/
   │  ├─ routes/                 # Fastify route handlers
   │  ├─ services/               # business logic / data access helpers
   │  ├─ db/                     # Drizzle schema, client, bootstrap/seed
   │  ├─ app.js                  # Fastify build + plugins + auth hook + route registration
   │  └─ server.js               # startup entry
   ├─ .env.example
   ├─ drizzle.config.js
   └─ package.json
```

## 3. Frontend Functionality (`portfolio_26`)

## 3.1 App bootstrap

- `src/main.js`:
  - Creates Vue app.
  - Installs Pinia.
  - Installs PrimeVue with Aura theme.
  - Loads global CSS and Prime Icons.

## 3.2 Main app behavior

- `src/App.vue` handles:
  - Theme switching (`light`/`dark`) via `data-theme` + localStorage.
  - Locale switching (`en`/`it`) via localStorage.
  - Catalog loading (`tracks`, `releases`) from backend.
  - Playback control with `<audio>` element.
  - Queue navigation (next/previous/shuffle/repeat).
  - Signed playback URL acquisition per track.
  - Admin dashboard for media/track/release CRUD.

Fallback behavior:

- If no tracks are returned, demo tracks are displayed.

## 3.3 State management

- `src/stores/player.js`:
  - Track normalization.
  - Queue ordering + shuffle.
  - History stack for previous-track logic.
  - Repeat modes: `off`, `all`, `one`.
  - Local file import preview using `URL.createObjectURL`.

- `src/stores/auth.js`:
  - Access-code persistence in localStorage (`portfolio_access_code`).
  - `isAdmin`/`isAuthenticated` computed from code presence.
  - Frontend-only auth state (backend still validates code).

## 3.4 API client

- `src/lib/api.js`:
  - Base URL from `VITE_API_BASE_URL` (default `http://localhost:4200/api`).
  - Sends cookies (`credentials: include`).
  - Adds `X-Access-Code` header when local code exists.
  - Throws normalized JS errors for non-2xx responses.

## 4. Backend Functionality (`portolio_26_be`)

## 4.1 App setup

- `src/app.js`:
  - Loads env.
  - Builds Fastify app.
  - Creates DB context (SQLite in dev by default, Postgres in production by default).
  - Bootstraps schema + seed data.
  - Registers plugins: CORS, cookie, multipart, static, JWT.
  - Registers auth hook and route modules.

## 4.2 Authentication model

Current backend supports two admin authentication paths:

1. `X-Access-Code` header equals `ADMIN_PASSWORD` -> admin user injected.
2. Session cookie (`SESSION_COOKIE_NAME`) validated against `sessions` table.

Route guard:

- `app.requireRole("admin")` enforces admin access for protected routes.

## 4.3 Public endpoints

- `GET /api/health`
- `GET /api/tracks`
- `GET /api/releases`
- `GET /api/releases/:releaseId`
- `POST /api/playback/authorize`
- `GET /api/playback/media/*`

## 4.4 Admin endpoints

- Auth/session:
  - `GET /api/auth/me`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`

- Tracks:
  - `GET /api/admin/tracks`
  - `GET /api/admin/tracks/:trackId`
  - `POST /api/admin/tracks`
  - `PUT /api/admin/tracks/:trackId`
  - `DELETE /api/admin/tracks/:trackId`

- Releases:
  - `GET /api/admin/releases`
  - `GET /api/admin/releases/:releaseId`
  - `POST /api/admin/releases`
  - `PUT /api/admin/releases/:releaseId`
  - `DELETE /api/admin/releases/:releaseId`

- Media:
  - `GET /api/admin/media`
  - `POST /api/admin/media/upload`

## 4.5 Media playback security

Playback URL signing in `routes/playback.js`:

- Uses HMAC SHA-256 with `MEDIA_SIGNING_SECRET`.
- Embeds `expires` timestamp and `signature` in URL query.
- Default token TTL: 300 seconds.
- `GET /playback/media/*` verifies:
  - token exists and not expired,
  - signature format and validity,
  - file path stays inside upload root,
  - optional byte-range request correctness.

## 5. Data Model (DB)

Core tables:

- `users`
- `sessions`
- `tracks`
- `releases`
- `release_tracks` (join + order)
- `media_assets`

Both SQLite and Postgres schema files define equivalent structures:

- `src/db/schema-sqlite.js`
- `src/db/schema-postgres.js`

Bootstrap tasks in `src/db/bootstrap.js`:

- Ensures table existence.
- Ensures/migrates path columns (`audio_path`, `artwork_path`, `path`).
- Seeds initial tracks/releases.
- Seeds an admin user if DB is empty.

## 6. Environment Variables

Important backend vars:

- `DB_CLIENT` (`sqlite` or `postgres`)
- `SQLITE_DB_PATH`
- `DATABASE_URL`
- `PORT`, `HOST`
- `COOKIE_SECRET`, `SESSION_COOKIE_NAME`
- `JWT_SECRET`
- `UPLOAD_DIR`, `PUBLIC_UPLOAD_BASE`
- `MEDIA_SIGNING_SECRET`, `MEDIA_BASE_URL`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`

Important frontend var:

- `VITE_API_BASE_URL` (example: `http://localhost:4200/api`)

## 7. Running the Project Locally

Backend:

1. `cd portolio_26_be`
2. Copy `.env.example` to `.env` and configure values.
3. `npm install`
4. `npm run dev`

Frontend:

1. `cd portfolio_26`
2. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.
3. `npm install`
4. `npm run dev`

## 8. Current Technical Notes

- There is an auth mismatch between frontend and backend flows:
  - Frontend login form in `App.vue` currently behaves as access-code login.
  - Backend `/auth/login` expects `email` + `password` for session auth.
- JWT plugin is installed in backend but not used in active route auth flow.
- Some frontend component files exist but are not currently wired into `App.vue`.

These are good candidates for cleanup/refactor in the next iteration.
