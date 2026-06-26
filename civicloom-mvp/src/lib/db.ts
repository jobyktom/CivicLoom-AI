import mysql, { type Pool } from "mysql2/promise";

let pool: Pool | null = null;

export function getDbConfigMode() {
  if (process.env.DATABASE_URL) return "DATABASE_URL";
  if (process.env.DB_HOST) return "DB_*";
  return "none";
}

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL || process.env.DB_HOST);
}

export function getDbPool() {
  if (!hasDatabaseConfig()) return null;

  if (!pool) {
    pool = process.env.DATABASE_URL
      ? mysql.createPool(process.env.DATABASE_URL)
      : mysql.createPool({
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT || 3306),
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          waitForConnections: true,
          connectionLimit: 5,
          namedPlaceholders: true,
        });
  }

  return pool;
}

export function getDatabaseErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "Unknown database error.";

  const err = error as { code?: string; message?: string };
  const message = err.message || "Unknown database error.";

  if (err.code === "ER_ACCESS_DENIED_ERROR") {
    return "Database login failed. Check DB_USER and DB_PASSWORD in your environment variables.";
  }

  if (err.code === "ER_BAD_DB_ERROR") {
    return "Database name was not found. Check DB_NAME or the database name in DATABASE_URL.";
  }

  if (err.code === "ER_NO_SUCH_TABLE") {
    return "Database connected, but tables are missing. Run hostinger/schema.sql in Hostinger phpMyAdmin.";
  }

  if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
    return "Database host is unreachable. Check DB_HOST and whether remote MySQL access is enabled.";
  }

  if (message.includes("Invalid URL")) {
    return "DATABASE_URL is invalid. If the password contains @, encode it as %40 or use DB_PASSWORD instead.";
  }

  return message;
}
