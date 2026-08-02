import "dotenv/config";
import {
  PrismaClient,
  ExerciseStatus,
  MovementType,
  MuscleGroup,
  PlanVisibility,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Exercise definitions needed for Level 3 (new ones the DB may not have yet)
// ---------------------------------------------------------------------------
const level3Exercises: {
  name: string;
  description: string;
  movementTypes: MovementType[];
  muscleGroups: MuscleGroup[];
}[] = [
  // Day 1 ─ Posterior Width & Biceps
  {
    name: "Meadows Rows",
    description:
      "One-arm landmine row: load one end of a barbell into a corner, stand perpendicular to it, and row the loaded end explosively to your hip. Epic lat stretch at the bottom.",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.BACK],
  },
  {
    name: "Bird-Dog Rows",
    description:
      "In a quadruped position, perform a dumbbell row with one arm while the opposite leg is extended. Maintains a 3-second eccentric for lat control.",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.BACK, MuscleGroup.CORE],
  },
  {
    name: "Incline DB Curls",
    description:
      "Sit on an incline bench (45-60°), let arms hang behind the body and curl dumbbells. Maximally stretches the bicep long head at the bottom.",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.ARMS],
  },
  {
    name: "Face Pulls",
    description:
      "Attach a rope to a high cable pulley. Pull the rope to collarbone height with elbows flared out. Keep weight at 15-20 kg max for strict form.",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.SHOULDERS, MuscleGroup.BACK],
  },
  {
    name: "Weighted Dead Hangs",
    description:
      "Hang from a pull-up bar holding a light dumbbell between your feet. Decompresses the spine and builds grip. Hold for 45 seconds.",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.BACK, MuscleGroup.ARMS],
  },
  // Day 2 ─ Chest & Shoulder Width
  {
    name: "Low-Incline DB Press",
    description:
      "Set the bench to a low incline (15-20°). Press dumbbells with a neutral or pronated grip for heavy upper-chest mechanical tension.",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.CHEST, MuscleGroup.SHOULDERS],
  },
  {
    name: "Arnold Press",
    description:
      "Seated dumbbell press starting with palms facing you, rotating to face forward as you press overhead. Massive rotational stretch for all three delt heads.",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.SHOULDERS],
  },
  {
    name: "Cable Lateral Raises",
    description:
      "Stand beside a low cable pulley, grip the handle with the far hand and raise laterally to shoulder height. Cables provide constant tension at the bottom unlike dumbbells.",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.SHOULDERS],
  },
  {
    name: "DB Skullcrushers",
    description:
      "Lie on a bench or floor, extend dumbbells overhead and lower them toward the temples by bending only at the elbows. Targets tricep long head.",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.ARMS],
  },
  {
    name: "Ab Wheel Rollouts",
    description:
      "Kneel with an ab wheel, roll forward as far as possible while keeping hips low, then roll back. Elite anti-extension core exercise.",
    movementTypes: [MovementType.CORE],
    muscleGroups: [MuscleGroup.CORE],
  },
  // Day 3 ─ The "No-Spine" Leg Builder
  {
    name: "Bulgarian Split Squats",
    description:
      "Rear foot elevated on a bench, front foot forward. Descend until the front thigh is parallel to the floor. The ultimate spine-safe unilateral leg builder.",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.LEGS],
  },
  {
    name: "Deficit Push-Ups",
    description:
      "Place hands on dumbbells or plates so you can descend below floor level. Increases chest stretch at the bottom for greater muscle activation.",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.CHEST, MuscleGroup.SHOULDERS, MuscleGroup.ARMS],
  },
  {
    name: "Suitcase Carries",
    description:
      "Carry a heavy dumbbell or kettlebell in ONE hand for 40 m per side. Brutal oblique anti-lateral-flexion work. Walk tall with no leaning.",
    movementTypes: [MovementType.CORE],
    muscleGroups: [MuscleGroup.CORE],
  },
  {
    name: "Pallof Press",
    description:
      "In a half-kneeling position beside a cable stack, press the handle directly in front of your chest and return. Anti-rotation core stability drill.",
    movementTypes: [MovementType.CORE],
    muscleGroups: [MuscleGroup.CORE],
  },
  {
    name: "Reverse Nordics",
    description:
      "Kneel on a mat with feet anchored, lean back slowly while keeping hips extended. Bodyweight quad isolation; go as low as control allows.",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.LEGS],
  },
];

// ---------------------------------------------------------------------------
// Plan structure
// ---------------------------------------------------------------------------
// Week 9 = Deload (Days 1-3 match Level 2 structure, content stored as a
//           plan description note since the workout itself is "do Level 2 at
//           70% weight, 3 RIR". We model it with the same 3-day cadence but
//           note the deload intent via the day labels.)
//
// Weeks 10-13 = Level 3 (4 repeats of the same 3-day split)
// Days: dayOfWeek: 0=Mon, 2=Wed, 4=Fri (3 days/week)

interface DayTemplate {
  dayOfWeek: number;
  label: string;
  exercises: {
    name: string;
    sets: number;
    reps: number;      // We'll use 0 to represent "to failure"
    restSeconds: number;
  }[];
}

const DELOAD_DAYS: DayTemplate[] = [
  {
    dayOfWeek: 0, // Monday
    label: "Deload Day 1 – Posterior Width & Biceps (70% weight, 3 RIR)",
    exercises: [
      { name: "Meadows Rows",        sets: 3, reps: 9,  restSeconds: 120 },
      { name: "Bird-Dog Rows",       sets: 3, reps: 10, restSeconds: 90  },
      { name: "Incline DB Curls",    sets: 3, reps: 12, restSeconds: 90  },
      { name: "Face Pulls",          sets: 3, reps: 15, restSeconds: 60  },
      { name: "Weighted Dead Hangs", sets: 2, reps: 1,  restSeconds: 90  }, // 1 rep = 45s hold
    ],
  },
  {
    dayOfWeek: 2, // Wednesday
    label: "Deload Day 2 – Chest & Shoulder Width (70% weight, 3 RIR)",
    exercises: [
      { name: "Low-Incline DB Press",  sets: 3, reps: 7,  restSeconds: 120 },
      { name: "Arnold Press",          sets: 3, reps: 9,  restSeconds: 90  },
      { name: "Cable Lateral Raises",  sets: 4, reps: 13, restSeconds: 60  },
      { name: "DB Skullcrushers",      sets: 3, reps: 11, restSeconds: 90  },
      { name: "Ab Wheel Rollouts",     sets: 3, reps: 11, restSeconds: 60  },
    ],
  },
  {
    dayOfWeek: 4, // Friday
    label: "Deload Day 3 – No-Spine Leg Builder (70% weight, 3 RIR)",
    exercises: [
      { name: "Bulgarian Split Squats", sets: 3, reps: 9,  restSeconds: 120 },
      { name: "Deficit Push-Ups",       sets: 3, reps: 8,  restSeconds: 90  },
      { name: "Suitcase Carries",       sets: 3, reps: 1,  restSeconds: 90  }, // 1 rep = 40m/side
      { name: "Pallof Press",           sets: 3, reps: 12, restSeconds: 60  },
      { name: "Reverse Nordics",        sets: 2, reps: 6,  restSeconds: 90  },
    ],
  },
];

const LEVEL3_DAYS: DayTemplate[] = [
  {
    dayOfWeek: 0,
    label: "Day 1 – Posterior Width & Biceps",
    exercises: [
      { name: "Meadows Rows",        sets: 3, reps: 9,  restSeconds: 120 },
      { name: "Bird-Dog Rows",       sets: 3, reps: 10, restSeconds: 90  },
      { name: "Incline DB Curls",    sets: 3, reps: 12, restSeconds: 90  },
      { name: "Face Pulls",          sets: 3, reps: 15, restSeconds: 60  },
      { name: "Weighted Dead Hangs", sets: 2, reps: 1,  restSeconds: 90  },
    ],
  },
  {
    dayOfWeek: 2,
    label: "Day 2 – Chest & Shoulder Width",
    exercises: [
      { name: "Low-Incline DB Press",  sets: 3, reps: 7,  restSeconds: 120 },
      { name: "Arnold Press",          sets: 3, reps: 9,  restSeconds: 90  },
      { name: "Cable Lateral Raises",  sets: 4, reps: 13, restSeconds: 60  },
      { name: "DB Skullcrushers",      sets: 3, reps: 11, restSeconds: 90  },
      { name: "Ab Wheel Rollouts",     sets: 3, reps: 11, restSeconds: 60  },
    ],
  },
  {
    dayOfWeek: 4,
    label: "Day 3 – The No-Spine Leg Builder",
    exercises: [
      { name: "Bulgarian Split Squats", sets: 3, reps: 9,  restSeconds: 120 },
      { name: "Deficit Push-Ups",       sets: 3, reps: 8,  restSeconds: 90  },
      { name: "Suitcase Carries",       sets: 3, reps: 1,  restSeconds: 90  },
      { name: "Pallof Press",           sets: 3, reps: 12, restSeconds: 60  },
      { name: "Reverse Nordics",        sets: 2, reps: 6,  restSeconds: 90  },
    ],
  },
];

// ---------------------------------------------------------------------------
async function main() {
  console.log("🔍 Looking up user 'dibbiny'...");

  const user = await prisma.user.findUnique({ where: { username: "dibbiny" } });
  if (!user) {
    throw new Error("User 'dibbiny' not found in the database.");
  }
  console.log(`✅ Found user: ${user.username} (${user.id})`);

  // Find an admin to credit exercise submissions
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin user found.");

  // ── 1. Upsert all Level 3 exercises ─────────────────────────────────────
  console.log("\n📦 Ensuring Level 3 exercises exist...");
  const exerciseMap: Record<string, string> = {}; // name → id

  for (const ex of level3Exercises) {
    const slugId = `l3-${ex.name.toLowerCase().replace(/[\s()\/]+/g, "-").replace(/-+/g, "-").replace(/-$/, "")}`;

    // Try to find by name first (case-insensitive)
    const existing = await prisma.exercise.findFirst({
      where: { name: { equals: ex.name, mode: "insensitive" } },
    });

    if (existing) {
      console.log(`  ↩  Already exists: "${existing.name}" (${existing.id})`);
      exerciseMap[ex.name] = existing.id;
    } else {
      const created = await prisma.exercise.create({
        data: {
          id: slugId,
          name: ex.name,
          description: ex.description,
          status: ExerciseStatus.APPROVED,
          submittedById: admin.id,
          approvedById: admin.id,
          approvedAt: new Date(),
          movementTypes: ex.movementTypes,
          muscleGroups: ex.muscleGroups,
        },
      });
      console.log(`  ➕ Created: "${created.name}" (${created.id})`);
      exerciseMap[ex.name] = created.id;
    }
  }

  // ── 2. Create the Training Plan ──────────────────────────────────────────
  console.log("\n🏗️  Creating training plan...");

  const plan = await prisma.trainingPlan.create({
    data: {
      title: "Core & Canopy: Level 3 (Advanced Hypertrophy)",
      description:
        "Week 9 is a mandatory DELOAD week. After 8 weeks of heavy progression, cut all weights by 30% and stop every set 3 reps short of failure — it should feel too easy. This dissipates CNS/joint fatigue to unmask the muscle you've built.\n\nWeeks 10–13 (Level 3): Unilateral hypertrophy with new muscle angles. We keep the spine safe while switching to advanced one-sided movements that force deeper muscle recruitment. Focus: Posterior width & bicep peaks (Day 1), Chest mechanical tension & side delt isolation (Day 2), Spine-safe leg hypertrophy (Day 3).",
      durationWeeks: 5, // Week 9 deload + Weeks 10-13
      visibility: PlanVisibility.PRIVATE,
      creatorId: user.id,
    },
  });

  console.log(`✅ Plan created: "${plan.title}" (${plan.id})`);

  // ── 3. Create Plan Days ──────────────────────────────────────────────────
  console.log("\n📅 Creating plan days...");

  // Week 9 = Deload (weekNumber: 9)
  for (const dayTmpl of DELOAD_DAYS) {
    const planDay = await prisma.planDay.create({
      data: {
        planId: plan.id,
        weekNumber: 9,
        dayOfWeek: dayTmpl.dayOfWeek,
        label: dayTmpl.label,
      },
    });

    let orderIndex = 0;
    for (const ex of dayTmpl.exercises) {
      const exerciseId = exerciseMap[ex.name];
      if (!exerciseId) {
        console.warn(`    ⚠ No exercise ID found for "${ex.name}"`);
        continue;
      }
      await prisma.planDayExercise.create({
        data: {
          planDayId: planDay.id,
          exerciseId,
          orderIndex: orderIndex++,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
        },
      });
    }
    console.log(`  ✅ Week 9 / ${dayTmpl.label}`);
  }

  // Weeks 10–13 (4 repeating weeks)
  for (let week = 10; week <= 13; week++) {
    for (const dayTmpl of LEVEL3_DAYS) {
      const planDay = await prisma.planDay.create({
        data: {
          planId: plan.id,
          weekNumber: week,
          dayOfWeek: dayTmpl.dayOfWeek,
          label: dayTmpl.label,
        },
      });

      let orderIndex = 0;
      for (const ex of dayTmpl.exercises) {
        const exerciseId = exerciseMap[ex.name];
        if (!exerciseId) {
          console.warn(`    ⚠ No exercise ID found for "${ex.name}"`);
          continue;
        }
        await prisma.planDayExercise.create({
          data: {
            planDayId: planDay.id,
            exerciseId,
            orderIndex: orderIndex++,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
          },
        });
      }
    }
    console.log(`  ✅ Week ${week} – 3 days created`);
  }

  console.log("\n🎉 Done! Plan fully seeded for dibbiny.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
