/*
  Warnings:

  - You are about to drop the column `joinType` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the `JoinRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "JoinRequest" DROP CONSTRAINT "JoinRequest_groupId_fkey";

-- DropForeignKey
ALTER TABLE "JoinRequest" DROP CONSTRAINT "JoinRequest_userId_fkey";

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "joinType";

-- DropTable
DROP TABLE "JoinRequest";

-- DropEnum
DROP TYPE "JoinRequestStatus";

-- DropEnum
DROP TYPE "JoinType";
