-- CreateTable
CREATE TABLE "DailyTotal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalSeconds" INTEGER NOT NULL,

    CONSTRAINT "DailyTotal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyTotal_userId_idx" ON "DailyTotal"("userId");

-- AddForeignKey
ALTER TABLE "DailyTotal" ADD CONSTRAINT "DailyTotal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
