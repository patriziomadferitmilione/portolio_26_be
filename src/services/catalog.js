import crypto from "node:crypto";
import { eq } from "drizzle-orm";

export async function listTracks(dbContext, { includePrivate = false } = {}) {
  const { db, schema } = dbContext;
  const rows = includePrivate
    ? await db.select().from(schema.tracks)
    : await db.select().from(schema.tracks).where(eq(schema.tracks.visibility, "public"));

  return rows.map(({ audioPath, ...track }) => ({
    ...track,
    audioPath: audioPath ?? "",
    storageKey: audioPath ?? ""
  }));
}

export async function findTrackById(dbContext, trackId) {
  const { db, schema } = dbContext;
  const rows = await db
    .select()
    .from(schema.tracks)
    .where(eq(schema.tracks.id, trackId))
    .limit(1);

  return rows[0] ?? null;
}

export async function createTrack(dbContext, input) {
  const { db, schema } = dbContext;
  const now = new Date().toISOString();
  const audioPath = input.audioPath ?? input.storageKey ?? "";
  const payload = {
    id: input.id ?? crypto.randomUUID(),
    title: input.title,
    artist: input.artist,
    mood: input.mood,
    duration: input.duration,
    visibility: input.visibility,
    audioPath,
    releaseLabel: input.releaseLabel,
    lyrics: input.lyrics ?? null,
    createdAt: now,
    updatedAt: now
  };

  await db.insert(schema.tracks).values(payload);
  return {
    ...payload,
    storageKey: audioPath
  };
}

export async function updateTrack(dbContext, trackId, input) {
  const { db, schema } = dbContext;
  const existing = await findTrackById(dbContext, trackId);
  if (!existing) {
    return null;
  }

  const payload = {
    title: input.title ?? existing.title,
    artist: input.artist ?? existing.artist,
    mood: input.mood ?? existing.mood,
    duration: input.duration ?? existing.duration,
    visibility: input.visibility ?? existing.visibility,
    audioPath: input.audioPath ?? input.storageKey ?? existing.audioPath,
    releaseLabel: input.releaseLabel ?? existing.releaseLabel,
    lyrics: input.lyrics ?? existing.lyrics,
    updatedAt: new Date().toISOString()
  };

  await db.update(schema.tracks).set(payload).where(eq(schema.tracks.id, trackId));
  return {
    ...existing,
    ...payload
  };
}

export async function deleteTrack(dbContext, trackId) {
  const { db, schema } = dbContext;
  const existing = await findTrackById(dbContext, trackId);
  if (!existing) {
    return false;
  }

  await db.delete(schema.tracks).where(eq(schema.tracks.id, trackId));
  return true;
}
