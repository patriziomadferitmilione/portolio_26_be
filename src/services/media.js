import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { desc } from "drizzle-orm";

function sanitizeFilename(filename) {
  const baseName = path.basename(filename).trim();
  const safeName = baseName
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return safeName || "file";
}

function ensureUniqueFilename(dir, filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let candidate = filename;
  let index = 1;

  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base} (${index})${ext}`;
    index += 1;
  }

  return candidate;
}

export async function saveUploadedAsset(dbContext, config, { fileBuffer, originalName, mimeType, category, uploadedByUserId }) {
  const safeOriginalName = sanitizeFilename(originalName);
  const safeCategory = category.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "misc";
  const targetDir = path.resolve(config.UPLOAD_DIR, "media", safeCategory);
  fs.mkdirSync(targetDir, { recursive: true });

  const filename = ensureUniqueFilename(targetDir, safeOriginalName);
  const fullPath = path.join(targetDir, filename);
  fs.writeFileSync(fullPath, fileBuffer);

  const relativePath = path.posix.join("media", safeCategory, filename);
  const publicUrl = `${config.PUBLIC_UPLOAD_BASE}/${relativePath}`;
  const now = new Date().toISOString();

  const asset = {
    id: crypto.randomUUID(),
    filename,
    originalName,
    mimeType,
    category: safeCategory,
    path: publicUrl,
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
