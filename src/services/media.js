import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { desc } from "drizzle-orm";

export async function saveUploadedAsset(dbContext, config, { fileBuffer, originalName, mimeType, category, uploadedByUserId }) {
  const ext = path.extname(originalName) || "";
  const safeCategory = category.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "misc";
  const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const targetDir = path.resolve(config.UPLOAD_DIR, safeCategory);
  fs.mkdirSync(targetDir, { recursive: true });

  const fullPath = path.join(targetDir, filename);
  fs.writeFileSync(fullPath, fileBuffer);

  const relativePath = path.posix.join(safeCategory, filename);
  const publicUrl = `${config.PUBLIC_UPLOAD_BASE}/${relativePath}`;
  const now = new Date().toISOString();

  const asset = {
    id: crypto.randomUUID(),
    filename,
    originalName,
    mimeType,
    category: safeCategory,
    url: publicUrl,
    storagePath: fullPath,
    size: fileBuffer.length,
    uploadedByUserId,
    createdAt: now
  };

  await dbContext.db.insert(dbContext.schema.mediaAssets).values(asset);
  return asset;
}

export async function listMediaAssets(dbContext) {
  return dbContext.db
    .select()
    .from(dbContext.schema.mediaAssets)
    .orderBy(desc(dbContext.schema.mediaAssets.createdAt));
}
