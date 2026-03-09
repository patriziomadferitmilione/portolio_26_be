import { z } from "zod";

import {
  createRelease,
  deleteRelease,
  findReleaseById,
  listReleases,
  updateRelease
} from "../services/releases.js";

const createReleaseSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  format: z.enum(["single", "ep", "album", "demo"]),
  visibility: z.enum(["public", "private"]),
  artworkUrl: z.string().min(1),
  notes: z.string().min(1),
  publishedAt: z.string().datetime().nullable().optional(),
  trackIds: z.array(z.string().min(1))
});

const updateReleaseSchema = createReleaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" }
);

export default async function adminReleaseRoutes(app) {
  const requireAdmin = app.requireRole("admin");

  app.get("/admin/releases", { preHandler: requireAdmin }, async () => ({
    items: await listReleases(app.dbContext, { includePrivate: true })
  }));

  app.get("/admin/releases/:releaseId", { preHandler: requireAdmin }, async (request, reply) => {
    const release = await findReleaseById(app.dbContext, request.params.releaseId, {
      includePrivate: true
    });

    if (!release) {
      return reply.code(404).send({ error: "Release not found" });
    }

    return { item: release };
  });

  app.post("/admin/releases", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = createReleaseSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid release payload",
        details: parsed.error.flatten()
      });
    }

    const release = await createRelease(app.dbContext, parsed.data);
    return reply.code(201).send({ item: release });
  });

  app.put("/admin/releases/:releaseId", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = updateReleaseSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid release payload",
        details: parsed.error.flatten()
      });
    }

    const release = await updateRelease(app.dbContext, request.params.releaseId, parsed.data);
    if (!release) {
      return reply.code(404).send({ error: "Release not found" });
    }

    return { item: release };
  });

  app.delete("/admin/releases/:releaseId", { preHandler: requireAdmin }, async (request, reply) => {
    const deleted = await deleteRelease(app.dbContext, request.params.releaseId);
    if (!deleted) {
      return reply.code(404).send({ error: "Release not found" });
    }

    return { ok: true };
  });
}
