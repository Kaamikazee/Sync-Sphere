-- AlterTable
ALTER TABLE "DailyTotal" ADD COLUMN     "isRunning" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startTimestamp" TIMESTAMP(3);
