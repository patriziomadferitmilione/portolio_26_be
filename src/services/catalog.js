import crypto from "node:crypto";
import { eq } from "drizzle-orm";

import { readUploadedAudioDuration } from "./audio-duration.js";

export async function listTracks(dbContext, { includePrivate = false } = {}) {
  const { db, schema } = dbContext;
  const rows = includePrivate
    ? await db.select().from(schema.tracks)
    : await db.select().from(schema.tracks).where(eq(schema.tracks.visibility, "public"));

  return rows.map(({ audioPath, artworkPath, ...track }) => ({
    ...track,
    audioPath: audioPath ?? "",
    artworkPath: artworkPath ?? "",
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

export async function createTrack(dbContext, input, config = {}) {
  const { db, schema } = dbContext;
  const now = new Date().toISOString();
  const audioPath = input.audioPath ?? input.storageKey ?? "";
  const detectedDuration = await readUploadedAudioDuration(config, audioPath);
  const payload = {
    id: input.id ?? crypto.randomUUID(),
    title: input.title,
    artist: input.artist,
    mood: input.mood,
    duration: detectedDuration ?? input.duration ?? 0,
    visibility: input.visibility,
    audioPath,
    artworkPath: input.artworkPath ?? null,
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

export async function updateTrack(dbContext, trackId, input, config = {}) {
  const { db, schema } = dbContext;
  const existing = await findTrackById(dbContext, trackId);
  if (!existing) {
    return null;
  }

  const nextAudioPath = input.audioPath ?? input.storageKey ?? existing.audioPath;
  const audioPathChanged = nextAudioPath !== existing.audioPath;
  const detectedDuration = audioPathChanged
    ? await readUploadedAudioDuration(config, nextAudioPath)
    : null;

  const payload = {
    title: input.title ?? existing.title,
    artist: input.artist ?? existing.artist,
    mood: input.mood ?? existing.mood,
    duration: detectedDuration ?? input.duration ?? existing.duration,
    visibility: input.visibility ?? existing.visibility,
    audioPath: nextAudioPath,
    artworkPath: input.artworkPath === undefined ? (existing.artworkPath ?? null) : input.artworkPath,
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
