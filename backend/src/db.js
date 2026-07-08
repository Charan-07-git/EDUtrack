// ============================================================
// Database Client – initializes and exports the Prisma client
// ============================================================

import { PrismaClient } from "@prisma/client";

const dbUrl = (process.env.DATABASE_URL || "").trim();
// Create a PrismaClient instance with the DATABASE_URL if available.
// If DATABASE_URL is not set, the client will use the default
// from the prisma schema's datasource block.
export const prisma = new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
});
