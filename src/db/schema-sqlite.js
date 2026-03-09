import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull()
});

export const tracks = sqliteTable("tracks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  mood: text("mood").notNull(),
  duration: integer("duration").notNull(),
  visibility: text("visibility").notNull(),
  storageKey: text("storage_key").notNull(),
  releaseLabel: text("release_label").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const releases = sqliteTable("releases", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  format: text("format").notNull(),
  visibility: text("visibility").notNull(),
  artworkUrl: text("artwork_url").notNull(),
  notes: text("notes").notNull(),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const releaseTracks = sqliteTable("release_tracks", {
  id: text("id").primaryKey(),
  releaseId: text("release_id").notNull().references(() => releases.id),
  trackId: text("track_id").notNull().references(() => tracks.id),
  position: integer("position").notNull()
});

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  category: text("category").notNull(),
  url: text("url").notNull(),
  storagePath: text("storage_path").notNull(),
  size: integer("size").notNull(),
  uploadedByUserId: text("uploaded_by_user_id").references(() => users.id),
  createdAt: text("created_at").notNull()
});
