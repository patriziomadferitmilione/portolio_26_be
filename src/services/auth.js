import crypto from "node:crypto";
import argon2 from "argon2";
import { and, eq, gt } from "drizzle-orm";

export function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function findUserByEmail(dbContext, email) {
  const { db, schema } = dbContext;
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  return rows[0] ?? null;
}

export async function verifyPassword(user, password) {
  if (!user) {
    return false;
  }

  return argon2.verify(user.passwordHash, password);
}

export async function createSession(dbContext, userId, ttlDays = 30) {
  const { db, schema } = dbContext;
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(schema.sessions).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt,
    createdAt: now.toISOString()
  });

  return {
    token,
    expiresAt
  };
}

export async function deleteSession(dbContext, token) {
  const { db, schema } = dbContext;
  await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashSessionToken(token)));
}

export async function findCurrentSession(dbContext, token) {
  const { db, schema } = dbContext;
  const tokenHash = hashSessionToken(token);
  const now = new Date().toISOString();

  const rows = await db
    .select({
      sessionId: schema.sessions.id,
      expiresAt: schema.sessions.expiresAt,
      userId: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      role: schema.users.role
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.tokenHash, tokenHash), gt(schema.sessions.expiresAt, now)))
    .limit(1);

  return rows[0] ?? null;
}
