CREATE TYPE "post_status" AS ENUM('draft', 'published');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "status" "post_status" DEFAULT 'published'::"post_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "published_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "posts" SET "published_at" = "created_at" WHERE "status" = 'published' AND "published_at" IS NULL;