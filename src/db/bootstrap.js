import crypto from "node:crypto";
import argon2 from "argon2";
import { count } from "drizzle-orm";

const seedTracks = [
  {
    id: "vinegar",
    title: "Vinegar",
    artist: "Patrizio Milione",
    mood: "Pop",
    duration: 170,
    visibility: "public",
    audioPath: "/uploads/media/audio/vinegar.mp3",
    releaseLabel: "Single 2020"
  },
  {
    id: "soda-and-lime",
    title: "Soda & Lime",
    artist: "Patrizio Milione feat. Ryota Saito",
    mood: "Alternative",
    duration: 235,
    visibility: "public",
    audioPath: "/uploads/media/audio/soda-and-lime.mp3",
    releaseLabel: "Single 2020"
  },
  {
    id: "but-then-comes-the-night",
    title: "But Then Comes the Night",
    artist: "Patrizio Milione",
    mood: "Pop",
    duration: 180,
    visibility: "private",
    audioPath: "/uploads/media/audio/but-then-comes-the-night.mp3",
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
    artworkPath: "/uploads/media/artwork/vinegar.jpg",
    notes: "Seed release for the initial catalog foundation.",
    publishedAt: "2020-10-09T00:00:00.000Z",
    trackIds: ["vinegar"]
  }
];

const seedAdminUser = {
  email: "patriziomilione@gmail.com",
  password: "yes",
  displayName: "Patrizio Milione"
};

export async function bootstrapDatabase(dbContext, config = {}) {
  await createTables(dbContext);
  await ensurePathColumns(dbContext);
  if (config.SEED_DEMO_DATA) {
    await seedTracksIfEmpty(dbContext);
    await seedReleasesIfEmpty(dbContext);
  }
  await seedAdminIfEmpty(dbContext);
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
      audio_path TEXT NOT NULL,
      artwork_path TEXT,
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
      artwork_path TEXT NOT NULL,
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
      path TEXT NOT NULL,
      url TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_by_user_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    )`
  );
}

async function ensurePathColumns(dbContext) {
  const { dialect } = dbContext;

  const existingColumns = await getExistingColumns(dbContext);

  const addColumnStatements = dialect === "postgres"
    ? [
        `ALTER TABLE tracks ADD COLUMN IF NOT EXISTS audio_path TEXT`,
        `ALTER TABLE tracks ADD COLUMN IF NOT EXISTS artwork_path TEXT`,
        `ALTER TABLE releases ADD COLUMN IF NOT EXISTS artwork_path TEXT`,
        `ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS path TEXT`
      ]
    : [];

  for (const statement of addColumnStatements) {
    await runStatement(dbContext, statement);
  }

  if (dialect === "sqlite") {
    if (!existingColumns.tracks.includes("audio_path")) {
      await runStatement(dbContext, `ALTER TABLE tracks ADD COLUMN audio_path TEXT`);
    }
    if (!existingColumns.tracks.includes("artwork_path")) {
      await runStatement(dbContext, `ALTER TABLE tracks ADD COLUMN artwork_path TEXT`);
    }
    if (!existingColumns.releases.includes("artwork_path")) {
      await runStatement(dbContext, `ALTER TABLE releases ADD COLUMN artwork_path TEXT`);
    }
    if (!existingColumns.mediaAssets.includes("path")) {
      await runStatement(dbContext, `ALTER TABLE media_assets ADD COLUMN path TEXT`);
    }
  }

  if (existingColumns.tracks.includes("storage_key")) {
    await runStatement(
      dbContext,
      `UPDATE tracks
       SET audio_path = COALESCE(NULLIF(audio_path, ''), storage_key)
       WHERE audio_path IS NULL OR audio_path = ''`
    );
  }

  if (existingColumns.releases.includes("artwork_url")) {
    await runStatement(
      dbContext,
      `UPDATE releases
       SET artwork_path = COALESCE(NULLIF(artwork_path, ''), artwork_url)
       WHERE artwork_path IS NULL OR artwork_path = ''`
    );
  }

  if (existingColumns.mediaAssets.includes("url")) {
    await runStatement(
      dbContext,
      `UPDATE media_assets
       SET path = COALESCE(NULLIF(path, ''), url)
       WHERE path IS NULL OR path = ''`
    );
  }
}

function getSqliteColumns(dbContext, tableName) {
  const result = dbContext.raw.prepare(`PRAGMA table_info(${tableName})`).all();
  return result.map((row) => row.name);
}

async function getPostgresColumns(dbContext, tableName) {
  const result = await dbContext.raw.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = $1`,
    [tableName]
  );

  return result.rows.map((row) => row.column_name);
}

async function getExistingColumns(dbContext) {
  const { dialect } = dbContext;
  if (dialect === "postgres") {
    return {
      tracks: await getPostgresColumns(dbContext, "tracks"),
      releases: await getPostgresColumns(dbContext, "releases"),
      mediaAssets: await getPostgresColumns(dbContext, "media_assets")
    };
  }

  return {
    tracks: getSqliteColumns(dbContext, "tracks"),
    releases: getSqliteColumns(dbContext, "releases"),
    mediaAssets: getSqliteColumns(dbContext, "media_assets")
  };
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

async function seedReleasesIfEmpty({ db, schema }) {
  const result = await db.select({ value: count() }).from(schema.releases);
  const total = Number(result[0]?.value ?? 0);
  if (total > 0) {
    return;
  }

  const now = new Date().toISOString();
  for (const release of seedReleases) {
    await db.insert(schema.releases).values({
      id: release.id,
      title: release.title,
      slug: release.slug,
      format: release.format,
      visibility: release.visibility,
      artworkPath: release.artworkPath,
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

async function seedAdminIfEmpty({ db, schema }) {
  const result = await db.select({ value: count() }).from(schema.users);
  const total = Number(result[0]?.value ?? 0);
  if (total > 0) {
    return;
  }

  const now = new Date().toISOString();
  await db.insert(schema.users).values({
    id: crypto.randomUUID(),
    email: seedAdminUser.email,
    passwordHash: await argon2.hash(seedAdminUser.password),
    displayName: seedAdminUser.displayName,
    role: "admin",
    createdAt: now,
    updatedAt: now
  });
}
