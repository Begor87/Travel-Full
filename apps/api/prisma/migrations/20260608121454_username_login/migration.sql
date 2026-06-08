-- Make email optional (username becomes the primary login identifier)
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Add optional, unique username
ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
