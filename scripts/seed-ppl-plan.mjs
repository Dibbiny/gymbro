import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const WEEKS = 12;

// Category IDs from DB
const CAT = {
  upper: "cat_upper_body",
  lower: "cat_lower_body",
  pull:  "cat_pull",
  push:  "cat_push",
  legs:  "cat_legs",
  core:  "cmnjxw809000004ldw7fyo4m2",
};

async function ensureExercise(name, categoryIds, description = null, demoUrl = null) {
  let ex = await db.exercise.findFirst({ where: { name } });
  if (!ex) {
    const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
    ex = await db.exercise.create({
      data: {
        name,
        description,
        demoUrl,
        status: "APPROVED",
        submittedById: admin.id,
        categories: { connect: categoryIds.map((id) => ({ id })) },
      },
    });
    console.log(`  Created exercise: "${name}"`);
  } else {
    console.log(`  Found exercise:   "${name}"`);
  }
  return ex;
}

async function main() {
  console.log("── Ensuring exercises exist ─────────────────────────────");

  const [
    inclineDB,
    dumbbellFloorPress,
    lateralRaises,
    tricepPushdowns,
    birdDogRow,
    chestSupportedRow,
    deadHangs,
    dumbbellBicepCurls,
    gobletSquat,
    gluteBridges,
    pallofPress,
    calfRaises,
  ] = await Promise.all([
    db.exercise.findFirst({ where: { name: "Incline Dumbbell Press" } }),
    ensureExercise(
      "Dumbbell Floor Press",
      [CAT.upper, CAT.push],
      "A chest press performed lying on the floor with dumbbells, limiting range of motion to protect the shoulders.",
      null
    ),
    db.exercise.findFirst({ where: { name: "Lateral Raises" } }),
    db.exercise.findFirst({ where: { name: "Tricep Rope Pushdowns" } }),
    db.exercise.findFirst({ where: { name: "Bird-Dog Row" } }),
    db.exercise.findFirst({ where: { name: "Chest-Supported Row" } }),
    db.exercise.findFirst({ where: { name: "Dead Hangs" } }),
    ensureExercise(
      "Dumbbell Bicep Curls",
      [CAT.upper, CAT.pull],
      "Classic bicep curls using dumbbells, allowing natural wrist rotation through the movement.",
      null
    ),
    db.exercise.findFirst({ where: { name: "Goblet Squat" } }),
    ensureExercise(
      "Glute Bridges",
      [CAT.lower, CAT.legs],
      "Lying on your back with knees bent, pushing your hips toward the ceiling to activate the glutes.",
      null
    ),
    db.exercise.findFirst({ where: { name: "Pallof Press" } }),
    db.exercise.findFirst({ where: { name: "Standing Calf Raises" } }),
  ]);

  // Day templates (dayOfWeek: Mon=0, Wed=2, Fri=4)
  const dayTemplates = [
    {
      label: "Push — Chest, Shoulders, Triceps",
      dayOfWeek: 0, // Monday
      exercises: [
        { exercise: inclineDB,         sets: 3, reps: 10, restSeconds: 105 },
        { exercise: dumbbellFloorPress, sets: 3, reps: 10, restSeconds: 90  },
        { exercise: lateralRaises,     sets: 3, reps: 12, restSeconds: 60  },
        { exercise: tricepPushdowns,   sets: 3, reps: 12, restSeconds: 60  },
      ],
    },
    {
      label: "Pull — Back, Biceps, Grip",
      dayOfWeek: 2, // Wednesday
      exercises: [
        { exercise: birdDogRow,        sets: 3, reps: 10, restSeconds: 90 },
        { exercise: chestSupportedRow, sets: 3, reps: 10, restSeconds: 90 },
        { exercise: deadHangs,         sets: 3, reps: 1,  restSeconds: 75 }, // 1 "rep" = 30-45 sec hold
        { exercise: dumbbellBicepCurls,sets: 3, reps: 12, restSeconds: 60 },
      ],
    },
    {
      label: "Legs & Core — Quads, Glutes, Core",
      dayOfWeek: 4, // Friday
      exercises: [
        { exercise: gobletSquat,    sets: 3, reps: 10, restSeconds: 105 },
        { exercise: gluteBridges,   sets: 3, reps: 12, restSeconds: 90  },
        { exercise: pallofPress,    sets: 3, reps: 10, restSeconds: 60  },
        { exercise: calfRaises,     sets: 3, reps: 15, restSeconds: 60  },
      ],
    },
  ];

  console.log("\n── Creating plan ────────────────────────────────────────");

  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });

  const plan = await db.trainingPlan.create({
    data: {
      title: "Push Pull Legs (PPL)",
      description:
        "A 3-day Push/Pull/Legs split designed for balanced strength and muscle development. " +
        "Push focuses on chest, shoulders, and triceps; Pull targets back, biceps, and grip; " +
        "Legs & Core covers quads, glutes, and core stability. Run Mon/Wed/Fri for 12 weeks.",
      durationWeeks: WEEKS,
      visibility: "PUBLIC",
      creatorId: admin.id,
    },
  });
  console.log(`  Created plan: "${plan.title}" (id: ${plan.id})`);

  console.log("\n── Creating plan days ───────────────────────────────────");

  for (let week = 1; week <= WEEKS; week++) {
    for (const tmpl of dayTemplates) {
      const planDay = await db.planDay.create({
        data: {
          planId: plan.id,
          weekNumber: week,
          dayOfWeek: tmpl.dayOfWeek,
          label: tmpl.label,
        },
      });

      await db.planDayExercise.createMany({
        data: tmpl.exercises.map((e, i) => ({
          planDayId: planDay.id,
          exerciseId: e.exercise.id,
          sets: e.sets,
          reps: e.reps,
          restSeconds: e.restSeconds,
          orderIndex: i,
        })),
      });

      process.stdout.write(`  Week ${String(week).padStart(2)} — ${tmpl.label.split("—")[0].trim()}\n`);
    }
  }

  console.log(`\n✓ Done — ${WEEKS * 3} plan days created.`);
}

main().catch(console.error).finally(() => db.$disconnect());
