import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const CAT = {
  push:  "cat_push",
  pull:  "cat_pull",
  legs:  "cat_legs",
  upper: "cat_upper_body",
  lower: "cat_lower_body",
};

// name → { categoryIds, demoUrl (only set if NEW — existing links are never touched) }
const EXERCISE_DEFS = [
  // Workout A
  { name: "Barbell Hip Thrusts",       cats: [CAT.lower, CAT.legs],  url: "https://www.youtube.com/watch?v=pBH7pKHn-dI" },
  { name: "DB Romanian Deadlifts",     cats: [CAT.lower, CAT.legs],  url: "https://www.youtube.com/watch?v=ANUCg1gdmeg" },
  { name: "Renegade Rows",             cats: [CAT.pull, CAT.upper],  url: "https://www.youtube.com/watch?v=qnT_EWBENqU" },
  { name: "Dumbbell Arnold Press",     cats: [CAT.push, CAT.upper],  url: "https://www.youtube.com/watch?v=ris9tKqMwgU" },
  { name: "Plank with Shoulder Taps",  cats: [CAT.upper],            url: "https://www.youtube.com/watch?v=10rvkoZ2r_Q" },
  // Workout B
  { name: "Bulgarian Split Squats",    cats: [CAT.legs, CAT.lower],  url: "https://www.youtube.com/watch?v=rah3eJCPXHA" },
  { name: "Single-Arm DB Row",         cats: [CAT.pull, CAT.upper],  url: "https://www.youtube.com/watch?v=jHMkcYbECkA" },
  { name: "Dumbbell Push Press",       cats: [CAT.push, CAT.upper],  url: "https://www.youtube.com/watch?v=bmbnyoQsL48" },
  { name: "Band Pull-Aparts",          cats: [CAT.pull, CAT.upper],  url: "https://www.youtube.com/watch?v=2fmxGGtdbog" },
  { name: "Russian Twists",            cats: [CAT.upper],            url: "https://www.youtube.com/watch?v=7_7LEesBumQ" },
  // Workout C
  { name: "Kettlebell Swings",         cats: [CAT.lower, CAT.legs],  url: "https://www.youtube.com/watch?v=bDCeXbMJVNs" },
  { name: "Weighted Step-Ups",         cats: [CAT.legs, CAT.lower],  url: "https://www.youtube.com/watch?v=I9lUOenjk9U" },
  { name: "Incline Push-Ups",          cats: [CAT.push, CAT.upper],  url: "https://www.youtube.com/watch?v=Cd7gGPHfFlc" },
  { name: "Lat Pulldown",              cats: [CAT.pull, CAT.upper],  url: null },  // already in DB — don't touch demoUrl
  { name: "Cable Woodchoppers",        cats: [CAT.upper],            url: "https://www.youtube.com/watch?v=GwxbI7hnnwI" },
];

async function ensureExercise(def, adminId) {
  const existing = await db.exercise.findFirst({
    where: { name: { equals: def.name, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (existing) {
    console.log(`  EXISTS:  ${def.name}`);
    return existing.id;
  }
  const created = await db.exercise.create({
    data: {
      name: def.name,
      status: "APPROVED",
      submittedById: adminId,
      approvedById: adminId,
      approvedAt: new Date(),
      ...(def.url ? { demoUrl: def.url } : {}),
      categories: { connect: def.cats.map((id) => ({ id })) },
    },
  });
  console.log(`  CREATED: ${def.name}${def.url ? " (with link)" : ""}`);
  return created.id;
}

async function main() {
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin found");
  console.log("Using admin:", admin.username);

  // ── 1. Ensure exercises ────────────────────────────────────────────────────
  console.log("\n── Ensuring exercises ───────────────────────────────────");
  const ids = {};
  for (const def of EXERCISE_DEFS) {
    ids[def.name] = await ensureExercise(def, admin.id);
  }

  // ── 2. Phase definitions (3 phases × 4 weeks each = 12 weeks) ────────────
  // reps: 0 = failure/AMRAP | per-side exercises use the listed rep count
  const phases = [
    // Phase 1: Weeks 1–4
    {
      workoutA: [
        { name: "Barbell Hip Thrusts",      sets: 3, reps: 11, restSeconds: 105 },
        { name: "DB Romanian Deadlifts",     sets: 3, reps: 10, restSeconds: 90  },
        { name: "Renegade Rows",             sets: 3, reps: 8,  restSeconds: 90  },
        { name: "Dumbbell Arnold Press",     sets: 3, reps: 11, restSeconds: 75  },
        { name: "Plank with Shoulder Taps",  sets: 3, reps: 16, restSeconds: 60  },
      ],
      workoutB: [
        { name: "Bulgarian Split Squats",    sets: 3, reps: 8,  restSeconds: 90  },
        { name: "Single-Arm DB Row",         sets: 3, reps: 10, restSeconds: 90  },
        { name: "Dumbbell Push Press",       sets: 3, reps: 9,  restSeconds: 90  },
        { name: "Band Pull-Aparts",          sets: 3, reps: 15, restSeconds: 60  },
        { name: "Russian Twists",            sets: 3, reps: 20, restSeconds: 60  },
      ],
      workoutC: [
        { name: "Kettlebell Swings",         sets: 3, reps: 15, restSeconds: 90  },
        { name: "Weighted Step-Ups",         sets: 3, reps: 10, restSeconds: 90  },
        { name: "Incline Push-Ups",          sets: 3, reps: 9,  restSeconds: 90  },
        { name: "Lat Pulldown",              sets: 3, reps: 10, restSeconds: 90  },
        { name: "Cable Woodchoppers",        sets: 3, reps: 10, restSeconds: 60  },
      ],
    },
    // Phase 2: Weeks 5–8
    {
      workoutA: [
        { name: "Barbell Hip Thrusts",      sets: 4, reps: 11, restSeconds: 105 },
        { name: "DB Romanian Deadlifts",     sets: 4, reps: 10, restSeconds: 90  },
        { name: "Renegade Rows",             sets: 3, reps: 10, restSeconds: 90  },
        { name: "Dumbbell Arnold Press",     sets: 4, reps: 11, restSeconds: 75  },
        { name: "Plank with Shoulder Taps",  sets: 3, reps: 20, restSeconds: 60  },
      ],
      workoutB: [
        { name: "Bulgarian Split Squats",    sets: 3, reps: 10, restSeconds: 90  },
        { name: "Single-Arm DB Row",         sets: 4, reps: 10, restSeconds: 90  },
        { name: "Dumbbell Push Press",       sets: 4, reps: 9,  restSeconds: 90  },
        { name: "Band Pull-Aparts",          sets: 4, reps: 15, restSeconds: 60  },
        { name: "Russian Twists",            sets: 3, reps: 30, restSeconds: 60  },
      ],
      workoutC: [
        { name: "Kettlebell Swings",         sets: 4, reps: 15, restSeconds: 90  },
        { name: "Weighted Step-Ups",         sets: 3, reps: 12, restSeconds: 90  },
        { name: "Incline Push-Ups",          sets: 3, reps: 11, restSeconds: 90  },
        { name: "Lat Pulldown",              sets: 4, reps: 10, restSeconds: 90  },
        { name: "Cable Woodchoppers",        sets: 3, reps: 12, restSeconds: 60  },
      ],
    },
    // Phase 3: Weeks 9–12
    {
      workoutA: [
        { name: "Barbell Hip Thrusts",      sets: 4, reps: 9,  restSeconds: 105 },
        { name: "DB Romanian Deadlifts",     sets: 4, reps: 8,  restSeconds: 90  },
        { name: "Renegade Rows",             sets: 3, reps: 12, restSeconds: 90  },
        { name: "Dumbbell Arnold Press",     sets: 4, reps: 9,  restSeconds: 75  },
        { name: "Plank with Shoulder Taps",  sets: 3, reps: 30, restSeconds: 60  },
      ],
      workoutB: [
        { name: "Bulgarian Split Squats",    sets: 4, reps: 9,  restSeconds: 90  },
        { name: "Single-Arm DB Row",         sets: 4, reps: 9,  restSeconds: 90  },
        { name: "Dumbbell Push Press",       sets: 4, reps: 8,  restSeconds: 90  },
        { name: "Band Pull-Aparts",          sets: 4, reps: 20, restSeconds: 60  },
        { name: "Russian Twists",            sets: 3, reps: 30, restSeconds: 60  },
      ],
      workoutC: [
        { name: "Kettlebell Swings",         sets: 4, reps: 20, restSeconds: 90  },
        { name: "Weighted Step-Ups",         sets: 4, reps: 10, restSeconds: 90  },
        { name: "Incline Push-Ups",          sets: 3, reps: 0,  restSeconds: 90  }, // to failure
        { name: "Lat Pulldown",              sets: 4, reps: 9,  restSeconds: 90  },
        { name: "Cable Woodchoppers",        sets: 3, reps: 15, restSeconds: 60  },
      ],
    },
  ];

  // ── 3. Build plan days (12 weeks, 3 days/week: Mon=0, Wed=2, Fri=4) ───────
  console.log("\n── Creating plan ────────────────────────────────────────");
  const WEEKS = 12;
  const dayOfWeekMap = { workoutA: 0, workoutB: 2, workoutC: 4 }; // Mon/Wed/Fri
  const labelMap = {
    workoutA: "Workout A — Glutes, Hamstrings & Shoulders",
    workoutB: "Workout B — Legs, Back & Core",
    workoutC: "Workout C — Full Body & Core",
  };

  const planDaysCreate = [];
  for (let w = 1; w <= WEEKS; w++) {
    const phaseIdx = w <= 4 ? 0 : w <= 8 ? 1 : 2;
    const phase = phases[phaseIdx];
    for (const workout of ["workoutA", "workoutB", "workoutC"]) {
      planDaysCreate.push({
        dayOfWeek: dayOfWeekMap[workout],
        weekNumber: w,
        label: labelMap[workout],
        planDayExercises: {
          create: phase[workout].map((ex, i) => ({
            orderIndex: i,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            exerciseId: ids[ex.name],
          })),
        },
      });
    }
  }

  const plan = await db.trainingPlan.create({
    data: {
      title: "Full Body Training",
      description:
        "12-week full body program, 3 days/week (Mon/Wed/Fri). Three rotating workouts " +
        "targeting glutes & hamstrings, legs & back, and full body. Progressive overload " +
        "across 3 phases: Foundation (wks 1–4), Build (wks 5–8), Peak (wks 9–12).",
      durationWeeks: WEEKS,
      visibility: "PUBLIC",
      creatorId: admin.id,
      planDays: { create: planDaysCreate },
    },
  });

  console.log(`\n✓ Plan created: "${plan.title}" (${plan.id})`);
  console.log(`  ${WEEKS} weeks × 3 workouts = ${WEEKS * 3} plan days`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
