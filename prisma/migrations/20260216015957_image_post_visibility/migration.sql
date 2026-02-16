/*
  Warnings:

  - You are about to drop the column `isPublished` on the `ImagePost` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('DRAFT', 'PRIVATE', 'UNLISTED', 'PUBLIC');

-- Add visibility column with default, then backfill from isPublished
ALTER TABLE "ImagePost" ADD COLUMN "visibility" "PostVisibility" NOT NULL DEFAULT 'DRAFT';

UPDATE "ImagePost"
SET "visibility" = 'PUBLIC'
WHERE "isPublished" = true;

ALTER TABLE "ImagePost" DROP COLUMN "isPublished";
