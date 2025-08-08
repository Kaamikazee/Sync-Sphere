-- DropForeignKey
ALTER TABLE "Warning" DROP CONSTRAINT "Warning_groupId_fkey";

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
