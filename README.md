# portolio_26_be

Backend API for music streaming app.

## What it does now

- Health check
- Public tracks and releases
- Signed playback authorization
- Cookie-backed admin auth
- Admin CRUD for tracks and releases
- Admin media uploads
- Local upload storage and public file serving

## Runtime

- Node.js
- Fastify
- Drizzle ORM
- SQLite local, PostgreSQL prod
- Cookie sessions for web auth
- JWT plugin installed, but current auth flow uses sessions

## Important env

- `DB_CLIENT`
- `SQLITE_DB_PATH`
- `DATABASE_URL`
- `PORT`
- `HOST`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `SESSION_COOKIE_NAME`
- `UPLOAD_DIR`
- `PUBLIC_UPLOAD_BASE`
- `MEDIA_SIGNING_SECRET`
- `MEDIA_BASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
