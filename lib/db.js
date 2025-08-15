// lib/db.js
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

// Keep a global variable to avoid multiple PrismaClient instances in dev
const globalForPrisma = globalThis;

const db = globalForPrisma.prismaGlobal ?? prismaClientSingleton();

export default db;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaGlobal = db;
}
