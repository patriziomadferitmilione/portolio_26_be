import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

import { findTrackById } from "../services/catalog.js";

const playbackSchema = z.object({
  trackId: z.string().min(1)
});

function createSignedPlaybackUrl({ baseUrl, storageKey, signingSecret, ttlSeconds = 300 }) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${storageKey}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", signingSecret)
    .update(payload)
    .digest("hex");

  const url = new URL(storageKey, `${baseUrl.replace(/\/$/, "")}/`);
  url.searchParams.set("expires", String(expiresAt));
  url.searchParams.set("signature", signature);
  return url.toString();
}

function verifyPlaybackSignature({ storageKey, expiresAt, signature, signingSecret }) {
  const payload = `${storageKey}:${expiresAt}`;
  const expectedSignature = crypto
    .createHmac("sha256", signingSecret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}

function buildPlaybackBaseUrl(request, fallbackBaseUrl) {
  if (fallbackBaseUrl) {
    return fallbackBaseUrl.replace(/\/$/, "");
  }

  const protocol = request.headers["x-forwarded-proto"] ?? "http";
  const host = request.headers.host;
  return `${protocol}://${host}/api/playback/media`;
}

function resolveStoragePath(uploadDir, storageKey) {
  const uploadRoot = path.resolve(uploadDir);
  const targetPath = path.resolve(uploadRoot, storageKey);

  if (!targetPath.startsWith(uploadRoot)) {
    return null;
  }

  return targetPath;
}

function getMimeType(storageKey) {
  const ext = path.extname(storageKey).toLowerCase();

  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".flac") return "audio/flac";

  return "application/octet-stream";
}

export default async function playbackRoutes(app) {
  app.post("/playback/authorize", async (request, reply) => {
    const parseResult = playbackSchema.safeParse(request.body ?? {});

    if (!parseResult.success) {
      return reply.code(400).send({
        error: "Invalid playback request",
        details: parseResult.error.flatten()
      });
    }

    const { trackId } = parseResult.data;
    const track = await findTrackById(app.dbContext, trackId);

    if (!track) {
      return reply.code(404).send({ error: "Track not found" });
    }

    return {
      trackId: track.id,
      streamUrl: createSignedPlaybackUrl({
        baseUrl: buildPlaybackBaseUrl(request, app.config.MEDIA_BASE_URL),
        storageKey: track.storageKey,
        signingSecret: app.config.MEDIA_SIGNING_SECRET
      }),
      expiresIn: 300
    };
  });

  app.get("/playback/media/*", async (request, reply) => {
    const storageKey = request.params["*"];
    const expiresAt = Number(request.query?.expires);
    const signature = String(request.query?.signature ?? "");

    if (!storageKey || !Number.isFinite(expiresAt) || !signature) {
      return reply.code(400).send({ error: "Invalid playback token" });
    }

    if (Math.floor(Date.now() / 1000) > expiresAt) {
      return reply.code(410).send({ error: "Playback token expired" });
    }

    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      return reply.code(400).send({ error: "Invalid playback signature" });
    }

    const isValidSignature = verifyPlaybackSignature({
      storageKey,
      expiresAt,
      signature,
      signingSecret: app.config.MEDIA_SIGNING_SECRET
    });

    if (!isValidSignature) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const filePath = resolveStoragePath(app.config.UPLOAD_DIR, storageKey);

    if (!filePath || !fs.existsSync(filePath)) {
      return reply.code(404).send({ error: "Media file not found" });
    }

    const stat = fs.statSync(filePath);
    const mimeType = getMimeType(storageKey);
    const rangeHeader = request.headers.range;

    reply.header("Accept-Ranges", "bytes");
    reply.header("Cache-Control", "private, max-age=300");
    reply.type(mimeType);

    if (!rangeHeader) {
      reply.header("Content-Length", stat.size);
      return reply.send(fs.createReadStream(filePath));
    }

    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (!match) {
      return reply.code(416).send({ error: "Invalid range" });
    }

    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : stat.size - 1;

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= stat.size) {
      return reply.code(416).send({ error: "Requested range not satisfiable" });
    }

    reply.code(206);
    reply.header("Content-Range", `bytes ${start}-${end}/${stat.size}`);
    reply.header("Content-Length", end - start + 1);
    return reply.send(fs.createReadStream(filePath, { start, end }));
  });
}
