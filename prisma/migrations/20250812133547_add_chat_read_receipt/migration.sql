/*
  Warnings:

  - You are about to drop the `ChatSeen` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatSeen" DROP CONSTRAINT "ChatSeen_chatId_fkey";

-- DropForeignKey
ALTER TABLE "ChatSeen" DROP CONSTRAINT "ChatSeen_userId_fkey";

-- DropTable
DROP TABLE "ChatSeen";

-- CreateTable
CREATE TABLE "ChatReadReceipt" (
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "lastSeenMessageId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReadReceipt_pkey" PRIMARY KEY ("userId","chatId")
);

-- CreateIndex
CREATE INDEX "ChatReadReceipt_chatId_idx" ON "ChatReadReceipt"("chatId");

-- CreateIndex
CREATE INDEX "ChatReadReceipt_lastSeenAt_idx" ON "ChatReadReceipt"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "ChatReadReceipt" ADD CONSTRAINT "ChatReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReadReceipt" ADD CONSTRAINT "ChatReadReceipt_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
