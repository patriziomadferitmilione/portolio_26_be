import { z } from "zod";

import {
  createSession,
  deleteSession,
  findUserByEmail,
  verifyPassword
} from "../services/auth.js";

const loginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().optional(),
  accessCode: z.string().optional()
}).refine((data) => (data.email && data.password) || data.accessCode, {
  message: "Either (email AND password) OR accessCode is required"
});

export default async function authRoutes(app) {
  app.get("/auth/me", async (request, reply) => {
    if (!request.currentUser) {
      return reply.code(401).send({ error: "Unauthenticated" });
    }

    return {
      user: request.currentUser
    };
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid login payload",
        details: parsed.error.flatten()
      });
    }

    const { email, password, accessCode } = parsed.data;
    const loginEmail = email ?? app.config.ADMIN_EMAIL;
    const loginPassword = password ?? accessCode;

    if (!loginEmail || !loginPassword) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const user = await findUserByEmail(app.dbContext, loginEmail);
    const isValid = await verifyPassword(user, loginPassword);

    if (!user || !isValid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const session = await createSession(app.dbContext, user.id);
    reply.setCookie(app.config.SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: app.config.NODE_ENV === "production",
      path: "/",
      expires: new Date(session.expiresAt)
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    };
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = request.cookies?.[app.config.SESSION_COOKIE_NAME];
    if (token) {
      await deleteSession(app.dbContext, token);
    }

    reply.clearCookie(app.config.SESSION_COOKIE_NAME, {
      path: "/"
    });

    return {
      ok: true
    };
  });
}
