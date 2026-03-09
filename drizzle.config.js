import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

export default {
  schema: isProduction ? "./src/db/schema-postgres.js" : "./src/db/schema-sqlite.js",
  out: "./drizzle",
  dialect: isProduction ? "postgresql" : "sqlite",
  dbCredentials: isProduction
    ? {
        url: process.env.DATABASE_URL ?? ""
      }
    : {
        url: process.env.SQLITE_DB_PATH ?? "./data/local.db"
      }
};
