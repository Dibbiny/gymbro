-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateTable (Prisma implicit M2M join)
CREATE TABLE "_CategoryToExercise" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX "_CategoryToExercise_AB_unique" ON "_CategoryToExercise"("A", "B");
CREATE INDEX "_CategoryToExercise_B_index" ON "_CategoryToExercise"("B");
ALTER TABLE "_CategoryToExercise" ADD CONSTRAINT "_CategoryToExercise_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CategoryToExercise" ADD CONSTRAINT "_CategoryToExercise_B_fkey" FOREIGN KEY ("B") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed existing categories
INSERT INTO "categories" ("id", "name", "createdAt") VALUES
  ('cat_upper_body', 'Upper Body', NOW()),
  ('cat_lower_body', 'Lower Body', NOW()),
  ('cat_pull', 'Pull', NOW()),
  ('cat_push', 'Push', NOW()),
  ('cat_legs', 'Legs', NOW());

-- Migrate existing exercise categories to join table
INSERT INTO "_CategoryToExercise" ("A", "B")
SELECT
  CASE e.category
    WHEN 'UPPER_BODY' THEN 'cat_upper_body'
    WHEN 'LOWER_BODY' THEN 'cat_lower_body'
    WHEN 'PULL' THEN 'cat_pull'
    WHEN 'PUSH' THEN 'cat_push'
    WHEN 'LEGS' THEN 'cat_legs'
  END,
  e.id
FROM exercises e
WHERE e.category IS NOT NULL;

-- Drop old index
DROP INDEX IF EXISTS "exercises_status_category_idx";

-- Drop category column from exercises
ALTER TABLE "exercises" DROP COLUMN "category";

-- Add new index
CREATE INDEX "exercises_status_idx" ON "exercises"("status");
