import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hasDatabaseConfig } from "@/lib/db";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getPrismaClient() {
  if (!hasDatabaseConfig()) return null;

  if (!globalForPrisma.prisma) {
    const adapter = process.env.DB_HOST
      ? new PrismaMariaDb(
          {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectionLimit: 5,
          },
          { database: process.env.DB_NAME },
        )
      : new PrismaMariaDb(process.env.DATABASE_URL!);

    globalForPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma;
}
