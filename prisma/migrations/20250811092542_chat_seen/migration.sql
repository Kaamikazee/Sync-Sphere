-- CreateTable
CREATE TABLE "ChatSeen" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatSeen_chatId_idx" ON "ChatSeen"("chatId");

-- CreateIndex
CREATE INDEX "ChatSeen_userId_idx" ON "ChatSeen"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatSeen_chatId_userId_key" ON "ChatSeen"("chatId", "userId");

-- AddForeignKey
ALTER TABLE "ChatSeen" ADD CONSTRAINT "ChatSeen_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSeen" ADD CONSTRAINT "ChatSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
