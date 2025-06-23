-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('FOCUS', 'BREAK');

-- DropForeignKey
ALTER TABLE "TimerSegment" DROP CONSTRAINT "TimerSegment_focusAreaId_fkey";

-- AlterTable
ALTER TABLE "TimerSegment" ADD COLUMN     "label" TEXT,
ADD COLUMN     "type" "SegmentType" NOT NULL DEFAULT 'FOCUS',
ALTER COLUMN "focusAreaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "TimerSegment" ADD CONSTRAINT "TimerSegment_focusAreaId_fkey" FOREIGN KEY ("focusAreaId") REFERENCES "FocusArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
