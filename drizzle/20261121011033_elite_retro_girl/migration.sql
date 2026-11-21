CREATE TYPE "user_status" AS ENUM('active', 'banned');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active'::"user_status" NOT NULL;