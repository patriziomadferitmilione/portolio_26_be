import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import fs from "node:fs";
import path from "node:path";

import { bootstrapDatabase } from "./db/bootstrap.js";
import { createDatabaseContext } from "./db/client.js";
import { deleteSession, findCurrentSession } from "./services/auth.js";
import authRoutes from "./routes/auth.js";
import adminMediaRoutes from "./routes/admin-media.js";
import adminReleaseRoutes from "./routes/admin-releases.js";
import adminTrackRoutes from "./routes/admin-tracks.js";
import healthRoutes from "./routes/health.js";
import releaseRoutes from "./routes/releases.js";
import trackRoutes from "./routes/tracks.js";
import playbackRoutes from "./routes/playback.js";

dotenv.config();

export async function buildApp() {
  const app = Fastify({ logger: true });

  app.decorate("config", buildConfig());
  app.decorateRequest("currentUser", null);

  const dbContext = await createDatabaseContext(app.config);
  app.decorate("dbContext", dbContext);

  await bootstrapDatabase(dbContext, app.config);

  app.register(cors, {
    origin: true,
    credentials: true
  });

  app.register(cookie, {
    secret: app.config.COOKIE_SECRET
  });

  app.register(multipart);

  fs.mkdirSync(path.resolve(app.config.UPLOAD_DIR), { recursive: true });

  app.register(fastifyStatic, {
    root: path.resolve(app.config.UPLOAD_DIR),
    prefix: `${app.config.PUBLIC_UPLOAD_BASE}/`
  });

  app.register(jwt, {
    secret: app.config.JWT_SECRET
  });

  app.addHook("onRequest", async (request, reply) => {
    // 1. Check for Access Code Header (Frontend-only bypass)
    const accessCode = request.headers["x-access-code"];
    if (accessCode && accessCode === app.config.ADMIN_PASSWORD) {
      request.currentUser = {
        id: "admin-bypass",
        email: app.config.ADMIN_EMAIL,
        displayName: app.config.ADMIN_NAME,
        role: "admin"
      };
      return;
    }

    // 2. Fallback to Session Cookie
    const token = request.cookies?.[app.config.SESSION_COOKIE_NAME];
    if (!token) {
      return;
    }

    const session = await findCurrentSession(app.dbContext, token);
    if (!session) {
      await deleteSession(app.dbContext, token);
      reply.clearCookie(app.config.SESSION_COOKIE_NAME, { path: "/" });
      return;
    }

    request.currentUser = {
      id: session.userId,
      email: session.email,
      displayName: session.displayName,
      role: session.role
    };
  });

  app.decorate("requireRole", (role) => async (request, reply) => {
    if (!request.currentUser) {
      return reply.code(401).send({ error: "Unauthenticated" });
    }

    if (request.currentUser.role !== role) {
      return reply.code(403).send({ error: "Forbidden" });
    }
  });

  app.register(healthRoutes, { prefix: "/api" });
  app.register(authRoutes, { prefix: "/api" });
  app.register(adminMediaRoutes, { prefix: "/api" });
  app.register(adminReleaseRoutes, { prefix: "/api" });
  app.register(adminTrackRoutes, { prefix: "/api" });
  app.register(releaseRoutes, { prefix: "/api" });
  app.register(trackRoutes, { prefix: "/api" });
  app.register(playbackRoutes, { prefix: "/api" });

  app.addHook("onClose", async () => {
    await app.dbContext.close();
  });

  return app;
}

function buildConfig() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const dbClient = process.env.DB_CLIENT
    ?? (nodeEnv === "production" ? "postgres" : "sqlite");

  if (dbClient === "postgres" && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when DB_CLIENT is postgres");
  }

  return {
    NODE_ENV: nodeEnv,
    DB_CLIENT: dbClient,
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    SQLITE_DB_PATH: process.env.SQLITE_DB_PATH ?? "./data/local.db",
    PORT: Number(process.env.PORT ?? 4200),
    HOST: process.env.HOST ?? "0.0.0.0",
    JWT_SECRET: process.env.JWT_SECRET ?? "change-me",
    COOKIE_SECRET: process.env.COOKIE_SECRET ?? "change-me",
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? "portfolio_session",
    UPLOAD_DIR: process.env.UPLOAD_DIR ?? "./uploads",
    PUBLIC_UPLOAD_BASE: process.env.PUBLIC_UPLOAD_BASE ?? "/uploads",
    MEDIA_SIGNING_SECRET: process.env.MEDIA_SIGNING_SECRET ?? "change-me",
    MEDIA_BASE_URL: process.env.MEDIA_BASE_URL ?? "",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? "",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "",
    ADMIN_NAME: process.env.ADMIN_NAME ?? "Patrizio Milione"
  };
}
