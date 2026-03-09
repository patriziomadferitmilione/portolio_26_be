import { z } from "zod";

import { listMediaAssets, saveUploadedAsset } from "../services/media.js";

const querySchema = z.object({
  category: z.string().optional()
});

export default async function adminMediaRoutes(app) {
  const requireAdmin = app.requireRole("admin");

  app.get("/admin/media", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = querySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid query",
        details: parsed.error.flatten()
      });
    }

    const items = await listMediaAssets(app.dbContext);
    const filtered = parsed.data.category
      ? items.filter((item) => item.category === parsed.data.category)
      : items;

    return { items: filtered };
  });

  app.post("/admin/media/upload", { preHandler: requireAdmin }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "File is required" });
    }

    const category = String(file.fields?.category?.value ?? "misc");
    const chunks = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }

    const asset = await saveUploadedAsset(app.dbContext, app.config, {
      fileBuffer: Buffer.concat(chunks),
      originalName: file.filename,
      mimeType: file.mimetype,
      category,
      uploadedByUserId: request.currentUser?.id ?? null
    });

    return reply.code(201).send({ item: asset });
  });
}
