-- Migration: Add HCC Authentication System
-- Add authentication fields to User table
ALTER TABLE "User" ADD COLUMN "role" VARCHAR(20) NOT NULL DEFAULT 'member';
ALTER TABLE "User" ADD COLUMN "invitedBy" UUID;
ALTER TABLE "User" ADD COLUMN "invitedAt" TIMESTAMP;
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Add foreign key constraint for invitedBy
ALTER TABLE "User" ADD CONSTRAINT "User_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id");

-- Create EmailWhitelist table
CREATE TABLE "EmailWhitelist" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(64) NOT NULL UNIQUE,
  "invitedBy" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailWhitelist_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id")
);

-- Set existing users as active admins (for initial setup)
UPDATE "User" SET "role" = 'admin', "isActive" = true WHERE "role" = 'member'; 