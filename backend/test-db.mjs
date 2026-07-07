import { PrismaClient } from "@prisma/client";
const url = "postgresql://postgres.atlzqfetorpjhuqfcbtg:Charancherry%402005@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require";
const p = new PrismaClient({ datasources: { db: { url } } });
try {
  await p.\();
  console.log("CONNECTED OK");
  const users = await p.user.findMany();
  console.log("USERS:", users.length);
  for (const u of users) {
    console.log(" -", u.email, u.role);
  }
} catch (e) {
  console.error("FAIL:", e.message);
} finally {
  await p.\();
}
