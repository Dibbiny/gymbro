-- Create enum types
CREATE TYPE "MovementType" AS ENUM ('PULL', 'PUSH', 'CORE');
CREATE TYPE "MuscleGroup" AS ENUM ('LEGS', 'BACK', 'ARMS', 'CHEST', 'SHOULDERS', 'CORE');

-- Add new columns to exercises
ALTER TABLE "exercises" ADD COLUMN "movementTypes" "MovementType"[] NOT NULL DEFAULT '{}';
ALTER TABLE "exercises" ADD COLUMN "muscleGroups" "MuscleGroup"[] NOT NULL DEFAULT '{}';

-- Drop old categories junction table and Category table
DROP TABLE IF EXISTS "_CategoryToExercise";
DROP TABLE IF EXISTS "categories";
