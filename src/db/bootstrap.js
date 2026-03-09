import crypto from "node:crypto";
import argon2 from "argon2";
import { count, eq } from "drizzle-orm";

const seedTracks = [
  {
    id: "vinegar",
    title: "Vinegar",
    artist: "Patrizio Milione",
    mood: "Pop",
    duration: 170,
    visibility: "public",
    storageKey: "tracks/vinegar/master.mp3",
    releaseLabel: "Single 2020"
  },
  {
    id: "soda-and-lime",
    title: "Soda & Lime",
    artist: "Patrizio Milione feat. Ryota Saito",
    mood: "Alternative",
    duration: 235,
    visibility: "public",
    storageKey: "tracks/soda-and-lime/master.mp3",
    releaseLabel: "Single 2020"
  },
  {
    id: "but-then-comes-the-night",
    title: "But Then Comes the Night",
    artist: "Patrizio Milione",
    mood: "Pop",
    duration: 180,
    visibility: "private",
    storageKey: "tracks/but-then-comes-the-night/master.mp3",
    releaseLabel: "Single 2020"
  }
];

export async function bootstrapDatabase(dbContext, config) {
  await createTables(dbContext);
  await seedTracksIfEmpty(dbContext);
  await seedAdminIfConfigured(dbContext, config);
}

async function createTables(dbContext) {
  await runStatement(
    dbContext,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  await runStatement(
    dbContext,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
  await runStatement(
    dbContext,
    `CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      mood TEXT NOT NULL,
      duration INTEGER NOT NULL,
      visibility TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      release_label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
}

async function runStatement({ dialect, raw }, statement) {
  if (dialect === "postgres") {
    await raw.query(statement);
    return;
  }

  raw.exec(statement);
}

async function seedTracksIfEmpty({ db, schema }) {
  const result = await db.select({ value: count() }).from(schema.tracks);
  const total = Number(result[0]?.value ?? 0);
  if (total > 0) {
    return;
  }

  const now = new Date().toISOString();
  await db.insert(schema.tracks).values(
    seedTracks.map((track) => ({
      ...track,
      createdAt: now,
      updatedAt: now
    }))
  );
}

async function seedAdminIfConfigured({ db, schema }, config) {
  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) {
    return;
  }

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, config.ADMIN_EMAIL))
    .limit(1);

  if (existing[0]) {
    return;
  }

  const now = new Date().toISOString();
  await db.insert(schema.users).values({
    id: crypto.randomUUID(),
    email: config.ADMIN_EMAIL,
    passwordHash: await argon2.hash(config.ADMIN_PASSWORD),
    displayName: config.ADMIN_NAME ?? "Patrizio Milione",
    role: "admin",
    createdAt: now,
    updatedAt: now
  });
}
