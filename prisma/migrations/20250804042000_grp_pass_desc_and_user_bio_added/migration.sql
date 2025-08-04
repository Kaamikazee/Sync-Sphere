-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT;
