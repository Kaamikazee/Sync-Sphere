/*
  Warnings:

  - Added the required column `groupId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Step 1: Add column as nullable (so migration doesn't fail)
ALTER TABLE "Message" ADD COLUMN "groupId" TEXT;

-- Step 2: Backfill values using relation from Chat → Group
UPDATE "Message"
SET "groupId" = "Chat"."groupId"
FROM "Chat"
WHERE "Message"."chatId" = "Chat"."id";

-- Step 3: Make it NOT NULL after data is populated
ALTER TABLE "Message" ALTER COLUMN "groupId" SET NOT NULL;


-- CreateTable
CREATE TABLE "SeenMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeenMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeenMessage_messageId_idx" ON "SeenMessage"("messageId");

-- CreateIndex
CREATE INDEX "SeenMessage_userId_idx" ON "SeenMessage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeenMessage_userId_messageId_key" ON "SeenMessage"("userId", "messageId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeenMessage" ADD CONSTRAINT "SeenMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeenMessage" ADD CONSTRAINT "SeenMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
