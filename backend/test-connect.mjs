import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  await p.$connect();
  console.log("DB_CONNECT_OK");
} catch (e) {
  console.log("DB_CONNECT_FAIL: " + (e?.message?.split("\n")[0] || e));
}
await p.$disconnect();
