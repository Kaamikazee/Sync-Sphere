/*
  Warnings:

  - You are about to drop the `DailyTotal` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DailyTotal" DROP CONSTRAINT "DailyTotal_userId_fkey";

-- DropTable
DROP TABLE "DailyTotal";
