import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import healthRoutes from "./routes/health.js";
import trackRoutes from "./routes/tracks.js";
import playbackRoutes from "./routes/playback.js";

dotenv.config();

export function buildApp() {
  const app = Fastify({ logger: true });

  app.decorate("config", {
    PORT: Number(process.env.PORT ?? 4200),
    HOST: process.env.HOST ?? "0.0.0.0",
    JWT_SECRET: process.env.JWT_SECRET ?? "change-me",
    MEDIA_SIGNING_SECRET: process.env.MEDIA_SIGNING_SECRET ?? "change-me",
    MEDIA_BASE_URL: process.env.MEDIA_BASE_URL ?? "https://media.example.com"
  });

  app.register(cors, {
    origin: true,
    credentials: true
  });

  app.register(jwt, {
    secret: app.config.JWT_SECRET
  });

  app.register(healthRoutes, { prefix: "/api" });
  app.register(trackRoutes, { prefix: "/api" });
  app.register(playbackRoutes, { prefix: "/api" });

  return app;
}
