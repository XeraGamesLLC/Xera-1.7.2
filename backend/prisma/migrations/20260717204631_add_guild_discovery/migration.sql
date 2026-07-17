-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "discoverable" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Guild_discoverable_idx" ON "Guild"("discoverable");
