import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const WEEKS = 12;

const CAT = {
  upper: "cat_upper_body",
  lower: "cat_lower_body",
  pull:  "cat_pull",
  push:  "cat_push",
  legs:  "cat_legs",
  core:  "cmnjxw809000004ldw7fyo4m2",
};

async function ensureExercise(name, categoryIds, description = null) {
  let ex = await db.exercise.findFirst({ where: { name } });
  if (!ex) {
    const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
    ex = await db.exercise.create({
      data: {
        name,
        description,
        status: "APPROVED",
        submittedById: admin.id,
        categories: { connect: categoryIds.map((id) => ({ id })) },
      },
    });
    console.log(`  Created: "${name}"`);
  } else {
    console.log(`  Found:   "${name}"`);
  }
  return ex;
}

async function main() {
  console.log("── Ensuring exercises exist ─────────────────────────────");

  const [
    inclineDB,
    chestSupportedRow,
    dumbbellFloorPress,
    birdDogRow,
    gobletSquat,
    reverseLunges,
    gluteBridges,
    pallofPress,
    lateralRaises,
    dumbbellBicepCurls,
    tricepPushdowns,
    deadHangs,
  ] = await Promise.all([
    db.exercise.findFirst({ where: { name: "Incline Dumbbell Press" } }),
    db.exercise.findFirst({ where: { name: "Chest-Supported Row" } }),
    db.exercise.findFirst({ where: { name: "Dumbbell Floor Press" } }),
    db.exercise.findFirst({ where: { name: "Bird-Dog Row" } }),
    db.exercise.findFirst({ where: { name: "Goblet Squat" } }),
    ensureExercise(
      "Dumbbell Reverse Lunges",
      [CAT.lower, CAT.legs],
      "Stepping backward into a lunge with dumbbells at your sides to build leg strength and balance with less knee stress than forward lunges."
    ),
    db.exercise.findFirst({ where: { name: "Glute Bridges" } }),
    db.exercise.findFirst({ where: { name: "Pallof Press" } }),
    db.exercise.findFirst({ where: { name: "Lateral Raises" } }),
    db.exercise.findFirst({ where: { name: "Dumbbell Bicep Curls" } }),
    db.exercise.findFirst({ where: { name: "Tricep Rope Pushdowns" } }),
    db.exercise.findFirst({ where: { name: "Dead Hangs" } }),
  ]);

  // Phase definitions: [sets, reps, restSeconds] per exercise
  // Phases: 0=weeks1-4, 1=weeks5-8, 2=weeks9-12
  const dayDefs = [
    {
      label: "A — Chest & Back",
      dayOfWeek: 0, // Monday
      phases: [
        // Weeks 1-4: Base Volume
        [
          { exercise: inclineDB,         sets: 3, reps: 10, restSeconds: 105 },
          { exercise: chestSupportedRow, sets: 3, reps: 10, restSeconds: 105 },
          { exercise: dumbbellFloorPress,sets: 3, reps: 11, restSeconds: 90  },
          { exercise: birdDogRow,        sets: 3, reps: 10, restSeconds: 90  },
        ],
        // Weeks 5-8: Hypertrophy
        [
          { exercise: inclineDB,         sets: 4, reps: 10, restSeconds: 105 },
          { exercise: chestSupportedRow, sets: 4, reps: 10, restSeconds: 105 },
          { exercise: dumbbellFloorPress,sets: 3, reps: 11, restSeconds: 90  },
          { exercise: birdDogRow,        sets: 3, reps: 12, restSeconds: 90  },
        ],
        // Weeks 9-12: Intensity
        [
          { exercise: inclineDB,         sets: 4, reps: 9,  restSeconds: 105 },
          { exercise: chestSupportedRow, sets: 4, reps: 9,  restSeconds: 105 },
          { exercise: dumbbellFloorPress,sets: 4, reps: 9,  restSeconds: 90  },
          { exercise: birdDogRow,        sets: 3, reps: 10, restSeconds: 90  },
        ],
      ],
    },
    {
      label: "B — Legs & Core",
      dayOfWeek: 2, // Wednesday
      phases: [
        // Weeks 1-4
        [
          { exercise: gobletSquat,    sets: 3, reps: 11, restSeconds: 105 },
          { exercise: reverseLunges,  sets: 3, reps: 9,  restSeconds: 90  },
          { exercise: gluteBridges,   sets: 3, reps: 13, restSeconds: 90  },
          { exercise: pallofPress,    sets: 3, reps: 10, restSeconds: 60  },
        ],
        // Weeks 5-8
        [
          { exercise: gobletSquat,    sets: 4, reps: 11, restSeconds: 105 },
          { exercise: reverseLunges,  sets: 3, reps: 11, restSeconds: 90  },
          { exercise: gluteBridges,   sets: 4, reps: 13, restSeconds: 90  },
          { exercise: pallofPress,    sets: 3, reps: 12, restSeconds: 60  },
        ],
        // Weeks 9-12
        [
          { exercise: gobletSquat,    sets: 4, reps: 9,  restSeconds: 105 },
          { exercise: reverseLunges,  sets: 4, reps: 9,  restSeconds: 90  },
          { exercise: gluteBridges,   sets: 4, reps: 11, restSeconds: 90  },
          { exercise: pallofPress,    sets: 3, reps: 12, restSeconds: 60  },
        ],
      ],
    },
    {
      label: "C — Shoulders & Arms",
      dayOfWeek: 4, // Friday
      phases: [
        // Weeks 1-4
        [
          { exercise: lateralRaises,     sets: 3, reps: 13, restSeconds: 75 },
          { exercise: dumbbellBicepCurls,sets: 3, reps: 12, restSeconds: 60 },
          { exercise: tricepPushdowns,   sets: 3, reps: 12, restSeconds: 60 },
          { exercise: deadHangs,         sets: 3, reps: 1,  restSeconds: 75 },
        ],
        // Weeks 5-8
        [
          { exercise: lateralRaises,     sets: 4, reps: 13, restSeconds: 75 },
          { exercise: dumbbellBicepCurls,sets: 4, reps: 12, restSeconds: 60 },
          { exercise: tricepPushdowns,   sets: 4, reps: 12, restSeconds: 60 },
          { exercise: deadHangs,         sets: 4, reps: 1,  restSeconds: 75 },
        ],
        // Weeks 9-12
        [
          { exercise: lateralRaises,     sets: 4, reps: 11, restSeconds: 75 },
          { exercise: dumbbellBicepCurls,sets: 4, reps: 10, restSeconds: 60 },
          { exercise: tricepPushdowns,   sets: 4, reps: 10, restSeconds: 60 },
          { exercise: deadHangs,         sets: 4, reps: 1,  restSeconds: 75 },
        ],
      ],
    },
  ];

  console.log("\n── Creating plan ────────────────────────────────────────");
  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });

  const plan = await db.trainingPlan.create({
    data: {
      title: "Home Dumbbell A/B/C",
      description:
        "A 3-day A/B/C split using dumbbells only, progressing through three phases over 12 weeks. " +
        "Weeks 1–4 build base volume; Weeks 5–8 increase sets for hypertrophy; Weeks 9–12 add intensity with heavier loads and fewer reps. " +
        "Train Mon/Wed/Fri or any 3 non-consecutive days.",
      durationWeeks: WEEKS,
      visibility: "PUBLIC",
      creatorId: admin.id,
    },
  });
  console.log(`  Created plan: "${plan.title}" (id: ${plan.id})`);

  console.log("\n── Creating plan days ───────────────────────────────────");

  for (let week = 1; week <= WEEKS; week++) {
    const phaseIndex = week <= 4 ? 0 : week <= 8 ? 1 : 2;
    const phaseLabel = week <= 4 ? "Base" : week <= 8 ? "Hypertrophy" : "Intensity";

    for (const day of dayDefs) {
      const exercises = day.phases[phaseIndex];

      const planDay = await db.planDay.create({
        data: {
          planId: plan.id,
          weekNumber: week,
          dayOfWeek: day.dayOfWeek,
          label: day.label,
        },
      });

      await db.planDayExercise.createMany({
        data: exercises.map((e, i) => ({
          planDayId: planDay.id,
          exerciseId: e.exercise.id,
          sets: e.sets,
          reps: e.reps,
          restSeconds: e.restSeconds,
          orderIndex: i,
        })),
      });
    }
    console.log(`  Week ${String(week).padStart(2)} (${phaseLabel}): A + B + C`);
  }

  console.log(`\n✓ Done — ${WEEKS * 3} plan days created.`);
}

main().catch(console.error).finally(() => db.$disconnect());
