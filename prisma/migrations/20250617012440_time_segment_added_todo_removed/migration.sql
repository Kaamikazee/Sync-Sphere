/*
  Warnings:

  - You are about to drop the `Todo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_activityId_fkey";

-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_userId_fkey";

-- DropTable
DROP TABLE "Todo";

-- CreateTable
CREATE TABLE "TimerSegment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "focusAreaId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimerSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FocusArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimerSegment_userId_date_idx" ON "TimerSegment"("userId", "date");

-- AddForeignKey
ALTER TABLE "TimerSegment" ADD CONSTRAINT "TimerSegment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerSegment" ADD CONSTRAINT "TimerSegment_focusAreaId_fkey" FOREIGN KEY ("focusAreaId") REFERENCES "FocusArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusArea" ADD CONSTRAINT "FocusArea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
