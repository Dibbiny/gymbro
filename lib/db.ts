import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({
    connectionString,
    // Supabase requires SSL in production
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    // 1 connection per serverless instance — Transaction mode pooler handles the rest
    max: process.env.NODE_ENV === "production" ? 1 : 10,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
