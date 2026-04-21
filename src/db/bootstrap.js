import crypto from "node:crypto";
import argon2 from "argon2";
import { eq } from "drizzle-orm";

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

const seedReleases = [
  {
    id: "release-vinegar-single",
    title: "Vinegar",
    slug: "vinegar",
    format: "single",
    visibility: "public",
    artworkUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop",
    notes: "Seed release for the initial catalog foundation.",
    publishedAt: "2020-10-09T00:00:00.000Z",
    trackIds: ["vinegar"]
  },
  {
    id: "release-soda-and-lime-single",
    title: "Soda & Lime",
    slug: "soda-and-lime",
    format: "single",
    visibility: "public",
    artworkUrl: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=500&h=500&fit=crop",
    notes: "Seed release for Soda & Lime.",
    publishedAt: "2020-11-13T00:00:00.000Z",
    trackIds: ["soda-and-lime"]
  },
  {
    id: "release-but-then-comes-the-night-single",
    title: "But Then Comes the Night",
    slug: "but-then-comes-the-night",
    format: "single",
    visibility: "private",
    artworkUrl: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=500&h=500&fit=crop",
    notes: "Seed release for But Then Comes the Night.",
    publishedAt: "2020-12-04T00:00:00.000Z",
    trackIds: ["but-then-comes-the-night"]
  }
];

export async function bootstrapDatabase(dbContext, config) {
  await createTables(dbContext);
  await seedTracksIfEmpty(dbContext);
  await seedReleasesIfEmpty(dbContext);
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
      lyrics TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
    );
  await runStatement(
    dbContext,
    `CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      format TEXT NOT NULL,
      visibility TEXT NOT NULL,
      artwork_url TEXT NOT NULL,
      notes TEXT NOT NULL,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  await runStatement(
    dbContext,
    `CREATE TABLE IF NOT EXISTS release_tracks (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    )`
  );
  await runStatement(
    dbContext,
    `CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      category TEXT NOT NULL,
      url TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_by_user_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
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
  const existingTrack = await db.select().from(schema.tracks).limit(1);
  if (existingTrack[0]) {
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

async function seedReleasesIfEmpty({ db, schema }) {
  const now = new Date().toISOString();
  for (const release of seedReleases) {
    const existingRelease = await db
      .select()
      .from(schema.releases)
      .where(eq(schema.releases.id, release.id))
      .limit(1);

    if (existingRelease[0]) {
      continue;
    }

    await db.insert(schema.releases).values({
      id: release.id,
      title: release.title,
      slug: release.slug,
      format: release.format,
      visibility: release.visibility,
      artworkUrl: release.artworkUrl,
      notes: release.notes,
      publishedAt: release.publishedAt,
      createdAt: now,
      updatedAt: now
    });

    await db.insert(schema.releaseTracks).values(
      release.trackIds.map((trackId, index) => ({
        id: crypto.randomUUID(),
        releaseId: release.id,
        trackId,
        position: index + 1
      }))
    );
  }
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
