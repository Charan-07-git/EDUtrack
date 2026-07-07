import { PrismaClient } from "@prisma/client";
import pkg from "@prisma/client/package.json" with { type: "json" };
console.log("Prisma version:", pkg.version);
