ALTER TABLE "posts" RENAME COLUMN "category" TO "category_id";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "category_id" SET DATA TYPE uuid USING "category_id"::uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE;