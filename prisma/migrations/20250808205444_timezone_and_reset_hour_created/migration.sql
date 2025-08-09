/*
  Warnings:

  - You are about to drop the column `date` on the `TimerSegment` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "TimerSegment_userId_date_idx";

-- AlterTable
ALTER TABLE "TimerSegment" DROP COLUMN "date";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetHour" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

-- CreateIndex
CREATE INDEX "TimerSegment_userId_start_idx" ON "TimerSegment"("userId", "start");
