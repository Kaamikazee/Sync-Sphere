// scripts/migrateDailyTotalsToIST.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateDailyTotalsToIST() {
  const IST_OFFSET_MINUTES = 330; // 5h 30m

  const records = await prisma.dailyTotal.findMany();
  console.log(`Found ${records.length} records.`);

  for (const record of records) {
    const newDate = new Date(record.date.getTime() + IST_OFFSET_MINUTES * 60000);

    await prisma.dailyTotal.update({
      where: {
        userId_date: {
          userId: record.userId,
          date: record.date,
        },
      },
      data: {
        date: newDate,
      },
    });
  }

  console.log("✅ Migration complete!");
}

migrateDailyTotalsToIST()
  .catch((err) => {
    console.error("❌ Migration failed:", err);
  })
  .finally(() => prisma.$disconnect());
