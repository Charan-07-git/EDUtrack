import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database...");
  await prisma.$connect();
  console.log("Connected!");

  // Check if Notification table exists
  try {
    const tables = await prisma.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    console.log("Tables:", tables.map(t => t.table_name).join(", "));
  } catch (e) {
    console.error("Failed to list tables:", e.message);
  }

  // Check Announcement columns
  try {
    const cols = await prisma.$queryRawUnsafe(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Announcement'`
    );
    console.log("Announcement columns:", cols.map(c => `${c.column_name} (${c.data_type})`).join(", "));
  } catch (e) {
    console.error("Failed to list Announcement columns:", e.message);
  }

  // Check Notification columns
  try {
    const cols = await prisma.$queryRawUnsafe(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Notification'`
    );
    console.log("Notification columns:", cols.map(c => `${c.column_name} (${c.data_type})`).join(", "));
  } catch (e) {
    console.error("Failed to list Notification columns:", e.message);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
