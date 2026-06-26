import mysql, { type Pool } from "mysql2/promise";

let pool: Pool | null = null;

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

