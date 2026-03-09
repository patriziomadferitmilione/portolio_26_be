import crypto from "node:crypto";
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

    if (track.visibility === "private" && !request.currentUser) {
      return reply.code(403).send({
        error: "Track requires authenticated access",
        code: "PRIVATE_TRACK"
      });
    }

    return {
      trackId: track.id,
      streamUrl: createSignedPlaybackUrl({
        baseUrl: app.config.MEDIA_BASE_URL,
        storageKey: track.storageKey,
        signingSecret: app.config.MEDIA_SIGNING_SECRET
      }),
      expiresIn: 300
    };
  });
}
