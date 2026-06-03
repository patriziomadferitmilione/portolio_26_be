import fs from "node:fs";
import path from "node:path";

import { parseFile } from "music-metadata";

function resolveUploadedFilePath(config, mediaPath) {
  if (!mediaPath) {
    return null;
  }

  let pathname = String(mediaPath);
  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return null;
    }
  }

  const uploadBase = String(config.PUBLIC_UPLOAD_BASE ?? "/uploads").replace(/\/$/, "");
  if (!pathname.startsWith(`${uploadBase}/`)) {
    return null;
  }

  const relativePath = pathname.slice(uploadBase.length).replace(/^\/+/, "");
  const uploadRoot = path.resolve(config.UPLOAD_DIR);
  const filePath = path.resolve(uploadRoot, relativePath);
  const relativeToRoot = path.relative(uploadRoot, filePath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return filePath;
}

export async function readUploadedAudioDuration(config, mediaPath) {
  const filePath = resolveUploadedFilePath(config, mediaPath);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  const metadata = await parseFile(filePath).catch(() => null);
  if (!metadata) {
    return null;
  }

  const duration = metadata.format.duration;

  if (!Number.isFinite(duration) || duration < 0) {
    return null;
  }

  return Math.round(duration);
}
