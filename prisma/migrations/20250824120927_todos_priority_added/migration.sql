-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX "Todo_date_idx" ON "Todo"("date");

-- CreateIndex
CREATE INDEX "Todo_priority_idx" ON "Todo"("priority");
