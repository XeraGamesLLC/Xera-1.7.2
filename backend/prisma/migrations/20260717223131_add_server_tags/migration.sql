-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "tag" VARCHAR(4);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "primaryGuildId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_primaryGuildId_fkey" FOREIGN KEY ("primaryGuildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;
