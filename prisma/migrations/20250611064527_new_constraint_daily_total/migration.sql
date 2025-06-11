/*
  Warnings:

  - A unique constraint covering the columns `[userId,date]` on the table `DailyTotal` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DailyTotal_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "DailyTotal_userId_date_key" ON "DailyTotal"("userId", "date");
