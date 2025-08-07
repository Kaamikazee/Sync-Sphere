-- CreateIndex
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageView_userId_idx" ON "MessageView"("userId");

-- CreateIndex
CREATE INDEX "MessageView_messageId_idx" ON "MessageView"("messageId");
