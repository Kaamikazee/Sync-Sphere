/*
  Warnings:

  - Added the required column `activityId` to the `Todo` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Todo_focusAreaId_idx";

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "activityId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Todo_activityId_idx" ON "Todo"("activityId");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
