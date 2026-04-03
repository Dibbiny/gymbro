import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  // Find admin user
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin user found");
  console.log("Using admin:", admin.username);

  // ── 1. Ensure all exercises exist ──────────────────────────────────────────
  const exerciseDefs = [
    // Day 1: Posterior Strength & Posture
    { name: "Bird-Dog Row",           category: "PULL" },
    { name: "Chest-Supported Row",    category: "PULL" },
    { name: "Face Pulls",             category: "PULL" },
    { name: "Dead Hangs",             category: "PULL" },
    // Day 2: Chest & Shoulder Pop
    { name: "Incline Dumbbell Press", category: "PUSH" },   // may already exist
    { name: "Landmine Press",         category: "PUSH" },
    { name: "Lateral Raises",         category: "PUSH" },
    { name: "Dead Bug",               category: "UPPER_BODY" },
    // Day 3: Foundation & Core Stability
    { name: "Goblet Squat",           category: "LEGS" },
    { name: "Weighted Push-Ups",      category: "PUSH" },
    { name: "Farmer's Carries",       category: "LEGS" },
    { name: "Pallof Press",           category: "UPPER_BODY" },
  ];

  const exerciseIds = {};

  for (const def of exerciseDefs) {
    const existing = await db.exercise.findFirst({
      where: { name: { equals: def.name, mode: "insensitive" } },
    });
    if (existing) {
      console.log(`  EXISTS: ${def.name} (${existing.id})`);
      exerciseIds[def.name] = existing.id;
    } else {
      const created = await db.exercise.create({
        data: {
          name: def.name,
          category: def.category,
          status: "APPROVED",
          submittedById: admin.id,
          approvedById: admin.id,
          approvedAt: new Date(),
        },
      });
      console.log(`  CREATED: ${def.name} (${created.id})`);
      exerciseIds[def.name] = created.id;
    }
  }

  // ── 2. Define the 3 days ───────────────────────────────────────────────────
  // dayOfWeek: Mon=0 … Sun=6
  // Day 1 → Sunday (6), Day 2 → Tuesday (1), Day 3 → Thursday (3)

  const dayTemplates = [
    {
      dayOfWeek: 6, // Sunday
      label: "Posterior Strength & Posture",
      exercises: [
        { name: "Bird-Dog Row",        sets: 3, reps: 12, restSeconds: 60 },
        { name: "Chest-Supported Row", sets: 3, reps: 10, restSeconds: 90 },
        { name: "Face Pulls",          sets: 3, reps: 15, restSeconds: 45 },
        { name: "Dead Hangs",          sets: 3, reps: 10, restSeconds: 60 },
      ],
    },
    {
      dayOfWeek: 1, // Tuesday
      label: "Chest & Shoulder Pop",
      exercises: [
        { name: "Incline Dumbbell Press", sets: 3, reps: 9,  restSeconds: 90 },
        { name: "Landmine Press",         sets: 3, reps: 10, restSeconds: 60 },
        { name: "Lateral Raises",         sets: 4, reps: 15, restSeconds: 45 },
        { name: "Dead Bug",               sets: 3, reps: 20, restSeconds: 45 },
      ],
    },
    {
      dayOfWeek: 3, // Thursday
      label: "Foundation & Core Stability",
      exercises: [
        { name: "Goblet Squat",      sets: 3, reps: 12, restSeconds: 90 },
        { name: "Weighted Push-Ups", sets: 3, reps: 10, restSeconds: 60 },
        { name: "Farmer's Carries",  sets: 3, reps: 40, restSeconds: 60 },
        { name: "Pallof Press",      sets: 3, reps: 12, restSeconds: 45 },
      ],
    },
  ];

  // ── 3. Create the training plan ───────────────────────────────────────────
  const WEEKS = 4;

  const plan = await db.trainingPlan.create({
    data: {
      title: "Core & Canopy",
      description:
        "Structural Integrity + Upper Body Hypertrophy. 3 days/week (Sun/Tue/Thu). " +
        "Rest 60–90s for compound lifts, 45–60s for isolation/core.",
      durationWeeks: WEEKS,
      visibility: "PUBLIC",
      creatorId: admin.id,
      planDays: {
        create: Array.from({ length: WEEKS }, (_, w) =>
          dayTemplates.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            weekNumber: w + 1,
            label: day.label,
            planDayExercises: {
              create: day.exercises.map((ex, i) => ({
                orderIndex: i,
                sets: ex.sets,
                reps: ex.reps,
                restSeconds: ex.restSeconds,
                exerciseId: exerciseIds[ex.name],
              })),
            },
          }))
        ).flat(),
      },
    },
  });

  console.log(`\nPlan created: "${plan.title}" (${plan.id})`);
  console.log(`  ${WEEKS} weeks × 3 days = ${WEEKS * 3} plan days`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
