-- CreateEnum
CREATE TYPE "NotifType" AS ENUM ('MESSAGE', 'TIMER_ENDED', 'TEAM_ALERT', 'WAKE_UP', 'WARNING', 'USER_JOINED', 'USER_LEFT', 'NEW_ANNOUNCEMENT', 'NOTICE', 'COMMENT', 'REPLY');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "senderId" TEXT,
    "type" "NotifType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
