/*
  Warnings:

  - You are about to drop the column `activityId` on the `Todo` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_activityId_fkey";

-- DropIndex
DROP INDEX "Todo_activityId_idx";

-- AlterTable
ALTER TABLE "Todo" DROP COLUMN "activityId";

-- CreateIndex
CREATE INDEX "Todo_focusAreaId_idx" ON "Todo"("focusAreaId");
