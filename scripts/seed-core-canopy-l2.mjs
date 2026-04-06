import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const CAT = {
  pull:  "cat_pull",
  push:  "cat_push",
  upper: "cat_upper_body",
  legs:  "cat_legs",
};

async function ensureExercise(name, categoryIds) {
  const existing = await db.exercise.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    console.log(`  EXISTS:  ${name} (${existing.id})`);
    return existing.id;
  }
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  const created = await db.exercise.create({
    data: {
      name,
      status: "APPROVED",
      submittedById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date(),
      categories: { connect: categoryIds.map((id) => ({ id })) },
    },
  });
  console.log(`  CREATED: ${name} (${created.id})`);
  return created.id;
}

async function main() {
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin user found");
  console.log("Using admin:", admin.username);

  // ── 1. Ensure all exercises exist ──────────────────────────────────────────
  console.log("\n── Ensuring exercises ───────────────────────────────────");
  const ids = {
    birdDogRow:           await ensureExercise("Bird-Dog Row",             [CAT.pull]),
    chestSupportedRow:    await ensureExercise("Chest-Supported Row",      [CAT.pull]),
    dbHammerCurls:        await ensureExercise("DB Hammer Curls",          [CAT.pull]),
    facePulls:            await ensureExercise("Face Pulls",               [CAT.pull]),
    activePassiveHangs:   await ensureExercise("Active/Passive Hangs",     [CAT.pull]),
    inclineDBPress:       await ensureExercise("Incline Dumbbell Press",   [CAT.push, CAT.upper]),
    landminePress:        await ensureExercise("Landmine Press",           [CAT.push]),
    lateralRaises:        await ensureExercise("Lateral Raises",           [CAT.push]),
    overheadTricepExt:    await ensureExercise("Overhead Tricep Extension",[CAT.push]),
    deadBug:              await ensureExercise("Dead Bug",                 [CAT.upper]),
    gobletSquat:          await ensureExercise("Goblet Squat",             [CAT.legs]),
    weightedPushUps:      await ensureExercise("Weighted Push-Ups",        [CAT.push]),
    farmersCarries:       await ensureExercise("Farmer's Carries",         [CAT.legs]),
    pallofPress:          await ensureExercise("Pallof Press",             [CAT.upper]),
    hollowBodyPlank:      await ensureExercise("Hollow Body Plank",        [CAT.upper]),
  };

  // ── 2. Day templates ───────────────────────────────────────────────────────
  // reps: 0 = to failure/AMRAP | Farmer's Carries reps = metres | Plank reps = seconds
  const dayTemplates = [
    {
      dayOfWeek: 0, // Sunday
      label: "Posterior Power & Grip",
      exercises: [
        { id: ids.birdDogRow,         sets: 3, reps: 12, restSeconds: 90 },
        { id: ids.chestSupportedRow,  sets: 3, reps: 10, restSeconds: 90 },
        { id: ids.dbHammerCurls,      sets: 3, reps: 12, restSeconds: 60 },
        { id: ids.facePulls,          sets: 3, reps: 15, restSeconds: 45 },
        { id: ids.activePassiveHangs, sets: 3, reps: 0,  restSeconds: 60 }, // to failure
      ],
    },
    {
      dayOfWeek: 2, // Tuesday
      label: "Shoulder & Chest Pop",
      exercises: [
        { id: ids.inclineDBPress,    sets: 3, reps: 9,  restSeconds: 90 }, // 8–10 avg
        { id: ids.landminePress,     sets: 3, reps: 10, restSeconds: 60 },
        { id: ids.lateralRaises,     sets: 4, reps: 12, restSeconds: 45 }, // +10 cheat reps drop set
        { id: ids.overheadTricepExt, sets: 2, reps: 15, restSeconds: 45 },
        { id: ids.deadBug,           sets: 3, reps: 20, restSeconds: 45 },
      ],
    },
    {
      dayOfWeek: 4, // Thursday
      label: "Foundation & Anti-Rotation",
      exercises: [
        { id: ids.gobletSquat,    sets: 3, reps: 12, restSeconds: 90 },
        { id: ids.weightedPushUps,sets: 3, reps: 0,  restSeconds: 60 }, // to failure
        { id: ids.farmersCarries, sets: 3, reps: 40, restSeconds: 60 }, // 40 metres
        { id: ids.pallofPress,    sets: 3, reps: 12, restSeconds: 45 },
        { id: ids.hollowBodyPlank,sets: 2, reps: 60, restSeconds: 45 }, // 60 seconds hold
      ],
    },
  ];

  // ── 3. Create the plan (4 weeks = Phase Weeks 5–8) ────────────────────────
  const WEEKS = 4;

  console.log("\n── Creating plan ────────────────────────────────────────");
  const plan = await db.trainingPlan.create({
    data: {
      title: "Core & Canopy: Level 2",
      description:
        "Hypertrophy phase of Core & Canopy — weeks 5–8. Maximum muscle growth + structural " +
        "resilience. 3 days/week (Sun/Tue/Thu). Slow eccentrics, peak contractions, and " +
        "mechanical drop sets. Rest 60–90s for main lifts, 45s for finishers/core.",
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
                exerciseId: ex.id,
              })),
            },
          }))
        ).flat(),
      },
    },
  });

  console.log(`\n✓ Plan created: "${plan.title}" (${plan.id})`);
  console.log(`  ${WEEKS} weeks × 3 days = ${WEEKS * 3} plan days`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
