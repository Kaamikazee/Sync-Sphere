-- CreateTable
CREATE TABLE "RunningTimer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTimestamp" TIMESTAMP(3) NOT NULL,
    "segmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunningTimer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RunningTimer_userId_key" ON "RunningTimer"("userId");

-- CreateIndex
CREATE INDEX "RunningTimer_userId_idx" ON "RunningTimer"("userId");

-- AddForeignKey
ALTER TABLE "RunningTimer" ADD CONSTRAINT "RunningTimer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunningTimer" ADD CONSTRAINT "RunningTimer_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "TimerSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
