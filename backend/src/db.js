import { PrismaClient } from "@prisma/client";

const dbUrl = (process.env.DATABASE_URL || "").trim();
export const prisma = new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
});
