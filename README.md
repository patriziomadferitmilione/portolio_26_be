# portolio_26_be

Backend API for the portfolio_26 music platform.

## Planned stack

- Node.js
- Fastify
- Drizzle ORM
- SQLite for local development
- PostgreSQL for production
- Cookie sessions for web auth
- JWT for playback and media delegation
- Object storage + signed media URLs

## Initial goals

- Health check and API bootstrap
- Track metadata endpoints
- Upload and playback authorization flow

## Local and Production Database

- Local development defaults to SQLite using `./data/local.db`
- Production defaults to PostgreSQL using `DATABASE_URL`
- Override behavior explicitly with `DB_CLIENT=sqlite` or `DB_CLIENT=postgres`

## Auth Foundation

- Web auth uses cookie-backed sessions stored in the database
- Playback can continue to use short-lived signed URLs or JWT-backed delegation later
- An initial admin user is seeded automatically when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set

## Uploads

- Admin media uploads are stored locally under `UPLOAD_DIR` in development
- Uploaded assets are exposed publicly under `PUBLIC_UPLOAD_BASE`
- The backend persists uploaded asset metadata in the `media_assets` table
