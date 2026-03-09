import { eq } from "drizzle-orm";

export async function listTracks(dbContext, { includePrivate = false } = {}) {
  const { db, schema } = dbContext;
  const rows = includePrivate
    ? await db.select().from(schema.tracks)
    : await db.select().from(schema.tracks).where(eq(schema.tracks.visibility, "public"));

  return rows.map(({ storageKey, ...track }) => track);
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
