-- CreateTable
CREATE TABLE "Mute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "mutedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Mute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mute_groupId_idx" ON "Mute"("groupId");

-- CreateIndex
CREATE INDEX "Mute_userId_groupId_idx" ON "Mute"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Mute_userId_groupId_key" ON "Mute"("userId", "groupId");
