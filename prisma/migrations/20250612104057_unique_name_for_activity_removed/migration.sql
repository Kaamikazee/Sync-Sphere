-- DropIndex
DROP INDEX "Activity_name_key";

-- AlterTable
ALTER TABLE "Todo" ALTER COLUMN "content" DROP NOT NULL;
