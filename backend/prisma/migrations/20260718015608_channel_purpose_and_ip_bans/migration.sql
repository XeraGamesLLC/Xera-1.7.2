-- CreateEnum
CREATE TYPE "ChannelPurpose" AS ENUM ('NORMAL', 'ANNOUNCEMENT', 'RULES');

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "purpose" "ChannelPurpose" NOT NULL DEFAULT 'NORMAL';

-- CreateTable
CREATE TABLE "IpBan" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT,
    "bannedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IpBan_ipAddress_key" ON "IpBan"("ipAddress");
