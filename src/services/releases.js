import crypto from "node:crypto";
import { eq, inArray } from "drizzle-orm";

function normalizeArtworkUrl(artworkUrl) {
  if (!artworkUrl) {
    return artworkUrl;
  }

  if (artworkUrl.startsWith("/artwork/")) {
    return artworkUrl.replace("/artwork/", "/uploads/artwork/");
  }

  return artworkUrl;
}

async function attachTracks(dbContext, releases, includePrivate) {
  const { db, schema } = dbContext;
  if (!releases.length) {
    return [];
  }

  const releaseIds = releases.map((release) => release.id);
  const links = await db
    .select()
    .from(schema.releaseTracks)
    .where(inArray(schema.releaseTracks.releaseId, releaseIds));

  const trackIds = [...new Set(links.map((row) => row.trackId))];
  const tracks = trackIds.length
    ? await db.select().from(schema.tracks).where(inArray(schema.tracks.id, trackIds))
    : [];

  const trackMap = new Map(tracks.map((track) => [track.id, track]));

  return releases.map((release) => {
    const orderedTracks = links
      .filter((link) => link.releaseId === release.id)
      .sort((a, b) => a.position - b.position)
      .map((link) => trackMap.get(link.trackId))
      .filter(Boolean)
      .filter((track) => includePrivate || track.visibility === "public")
      .map(({ storageKey, ...track }) => track);

    return {
      ...release,
      artworkUrl: normalizeArtworkUrl(release.artworkUrl),
      tracks: orderedTracks
    };
  });
}

export async function listReleases(dbContext, { includePrivate = false } = {}) {
  const { db, schema } = dbContext;
  const rows = includePrivate
    ? await db.select().from(schema.releases)
    : await db.select().from(schema.releases).where(eq(schema.releases.visibility, "public"));

  return attachTracks(dbContext, rows, includePrivate);
}

export async function findReleaseById(dbContext, releaseId, { includePrivate = false } = {}) {
  const { db, schema } = dbContext;
  const rows = await db
    .select()
    .from(schema.releases)
    .where(eq(schema.releases.id, releaseId))
    .limit(1);

  const release = rows[0] ?? null;
  if (!release || (!includePrivate && release.visibility !== "public")) {
    return null;
  }

  const [fullRelease] = await attachTracks(dbContext, [release], includePrivate);
  return fullRelease ?? null;
}

export async function createRelease(dbContext, input) {
  const { db, schema } = dbContext;
  const releaseId = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(schema.releases).values({
    id: releaseId,
    title: input.title,
    slug: input.slug,
    format: input.format,
    visibility: input.visibility,
    artworkUrl: input.artworkUrl,
    notes: input.notes,
    publishedAt: input.publishedAt ?? null,
    createdAt: now,
    updatedAt: now
  });

  if (input.trackIds.length) {
    await db.insert(schema.releaseTracks).values(
      input.trackIds.map((trackId, index) => ({
        id: crypto.randomUUID(),
        releaseId,
        trackId,
        position: index + 1
      }))
    );
  }

  return findReleaseById(dbContext, releaseId, { includePrivate: true });
}

export async function updateRelease(dbContext, releaseId, input) {
  const { db, schema } = dbContext;
  const existing = await findReleaseById(dbContext, releaseId, { includePrivate: true });
  if (!existing) {
    return null;
  }

  await db
    .update(schema.releases)
    .set({
      title: input.title ?? existing.title,
      slug: input.slug ?? existing.slug,
      format: input.format ?? existing.format,
      visibility: input.visibility ?? existing.visibility,
      artworkUrl: input.artworkUrl ?? existing.artworkUrl,
      notes: input.notes ?? existing.notes,
      publishedAt: input.publishedAt === undefined ? existing.publishedAt : input.publishedAt,
      updatedAt: new Date().toISOString()
    })
    .where(eq(schema.releases.id, releaseId));

  if (input.trackIds) {
    await db.delete(schema.releaseTracks).where(eq(schema.releaseTracks.releaseId, releaseId));

    if (input.trackIds.length) {
      await db.insert(schema.releaseTracks).values(
        input.trackIds.map((trackId, index) => ({
          id: crypto.randomUUID(),
          releaseId,
          trackId,
          position: index + 1
        }))
      );
    }
  }

  return findReleaseById(dbContext, releaseId, { includePrivate: true });
}

export async function deleteRelease(dbContext, releaseId) {
  const { db, schema } = dbContext;
  const existing = await findReleaseById(dbContext, releaseId, { includePrivate: true });
  if (!existing) {
    return false;
  }

  await db.delete(schema.releaseTracks).where(eq(schema.releaseTracks.releaseId, releaseId));
  await db.delete(schema.releases).where(eq(schema.releases.id, releaseId));
  return true;
}
