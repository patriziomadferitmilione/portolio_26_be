import { z } from "zod";

import {
  createTrack,
  deleteTrack,
  listTracks,
  findTrackById,
  updateTrack
} from "../services/catalog.js";

const trackCreateSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  artist: z.string().min(1),
  mood: z.string().min(1),
  duration: z.number().int().nonnegative(),
  visibility: z.enum(["public", "private"]),
  storageKey: z.string().min(1),
  releaseLabel: z.string().min(1)
});

const trackUpdateSchema = trackCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" }
);

export default async function adminTrackRoutes(app) {
  const requireAdmin = app.requireRole("admin");

  app.get("/admin/tracks", { preHandler: requireAdmin }, async () => ({
    items: await listTracks(app.dbContext, { includePrivate: true })
  }));

  app.get("/admin/tracks/:trackId", { preHandler: requireAdmin }, async (request, reply) => {
    const track = await findTrackById(app.dbContext, request.params.trackId);
    if (!track) {
      return reply.code(404).send({ error: "Track not found" });
    }

    return { item: track };
  });

  app.post("/admin/tracks", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = trackCreateSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid track payload",
        details: parsed.error.flatten()
      });
    }

    const track = await createTrack(app.dbContext, parsed.data);
    return reply.code(201).send({ item: track });
  });

  app.put("/admin/tracks/:trackId", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = trackUpdateSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid track payload",
        details: parsed.error.flatten()
      });
    }

    const track = await updateTrack(app.dbContext, request.params.trackId, parsed.data);
    if (!track) {
      return reply.code(404).send({ error: "Track not found" });
    }

    return { item: track };
  });

  app.delete("/admin/tracks/:trackId", { preHandler: requireAdmin }, async (request, reply) => {
    const deleted = await deleteTrack(app.dbContext, request.params.trackId);
    if (!deleted) {
      return reply.code(404).send({ error: "Track not found" });
    }

    return { ok: true };
  });
}
