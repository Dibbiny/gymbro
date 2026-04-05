-- AlterTable
ALTER TABLE "_CategoryToExercise" ADD CONSTRAINT "_CategoryToExercise_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CategoryToExercise_AB_unique";

-- AlterTable
ALTER TABLE "set_logs" ADD COLUMN     "notes" TEXT;

-- DropEnum
DROP TYPE "ExerciseCategory";
