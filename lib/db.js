// lib/db.js
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"], // add "query" for debugging in dev if needed
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
