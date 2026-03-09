import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as sqliteSchema from "./schema-sqlite.js";
import * as postgresSchema from "./schema-postgres.js";

export async function createDatabaseContext(config) {
  if (config.DB_CLIENT === "postgres") {
    const pool = new Pool({
      connectionString: config.DATABASE_URL
    });

    return {
      dialect: "postgres",
      db: drizzlePg(pool, { schema: postgresSchema }),
      schema: postgresSchema,
      raw: pool,
      close: async () => pool.end()
    };
  }

  const resolvedPath = path.resolve(config.SQLITE_DB_PATH);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const sqlite = new Database(resolvedPath);
  sqlite.pragma("journal_mode = WAL");

  return {
    dialect: "sqlite",
    db: drizzleSqlite(sqlite, { schema: sqliteSchema }),
    schema: sqliteSchema,
    raw: sqlite,
    close: async () => sqlite.close()
  };
}
