import "dotenv/config";
import { PrismaClient, ExerciseStatus, MovementType, MuscleGroup } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const exercises: {
  name: string;
  movementTypes: MovementType[];
  muscleGroups: MuscleGroup[];
  demoUrl: string;
  description: string;
}[] = [
  {
    name: "Heavy DB Rows",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.BACK],
    demoUrl: "https://www.youtube.com/watch?v=g4E5goYVeYs",
    description: "Brace one hand on a bench, row a heavy dumbbell explosively to your hip. Focus on driving the elbow back and squeezing the lat at the top.",
  },
  {
    name: "Kneeling Cable Pullovers",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.BACK],
    demoUrl: "https://www.youtube.com/watch?v=mv02Qbiwhbo",
    description: "Kneel facing a high cable pulley, arms extended overhead. Pull the cable down in an arc until your hands reach your hips. Excellent lat isolation with constant tension.",
  },
  {
    name: "Strict Face Pulls",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.SHOULDERS, MuscleGroup.BACK],
    demoUrl: "https://www.youtube.com/watch?v=rep-qVOkqgk",
    description: "Attach a rope to a high cable. Pull the rope to forehead level with elbows high and wide. Strict form: no momentum, keep weight controlled at 15–20 kg max.",
  },
  {
    name: "Incline DB Curls",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.ARMS],
    demoUrl: "https://www.youtube.com/watch?v=uZ7JZ8Lx51s",
    description: "Sit on an incline bench (45–60°), let arms hang behind the body and curl dumbbells. Maximally stretches the bicep long head at the bottom.",
  },
  {
    name: "Weighted Dead Hangs",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.BACK, MuscleGroup.ARMS],
    demoUrl: "https://www.youtube.com/watch?v=1uTplND3Z64",
    description: "Hang from a pull-up bar holding a light dumbbell between your feet. Decompresses the spine and builds grip strength. Hold for 45 seconds.",
  },
  {
    name: "Low-Incline DB Press",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.CHEST],
    demoUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
    description: "Set the bench to a low incline (15–20°). Press dumbbells for heavy upper-chest mechanical tension.",
  },
  {
    name: "Seated DB Shoulder Press",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.SHOULDERS],
    demoUrl: "https://www.youtube.com/watch?v=TsduLWuhlFM",
    description: "Sit upright on a bench, press dumbbells from shoulder height directly overhead. Controls scapular movement better than standing variations.",
  },
  {
    name: "Cable Lateral Raises",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.SHOULDERS],
    demoUrl: "https://www.youtube.com/watch?v=L2Ffu3rHgKw",
    description: "Stand beside a low cable pulley, grip the handle with the far hand and raise laterally to shoulder height. Cables provide constant tension at the bottom unlike dumbbells.",
  },
  {
    name: "Cable Tricep Pushdowns",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.ARMS],
    demoUrl: "https://www.youtube.com/watch?v=e60EKJzv2Go",
    description: "Attach a bar or rope to a high cable. Keep elbows pinned to your sides and push the cable down until arms are fully extended. Squeeze the triceps at the bottom.",
  },
  {
    name: "Ab Wheel Rollouts",
    movementTypes: [MovementType.CORE],
    muscleGroups: [MuscleGroup.CORE],
    demoUrl: "https://www.youtube.com/watch?v=_BHKT60P6bc",
    description: "Kneel with an ab wheel, roll forward as far as possible while keeping hips low, then roll back. Elite anti-extension core exercise.",
  },
  {
    name: "Bulgarian Split Squats",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.LEGS],
    demoUrl: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
    description: "Rear foot elevated on a bench, front foot forward. Descend until the front thigh is parallel to the floor. The ultimate spine-safe unilateral leg builder.",
  },
  {
    name: "Dumbbell RDLs",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.LEGS],
    demoUrl: "https://www.youtube.com/watch?v=_DhDkij1vxY",
    description: "Hold dumbbells in front of your thighs, hinge at the hips with a soft bend in the knees, lowering the weights along your legs until you feel a deep hamstring stretch, then drive back up.",
  },
  {
    name: "Heavy Farmer's Carries",
    movementTypes: [MovementType.CORE],
    muscleGroups: [MuscleGroup.CORE, MuscleGroup.ARMS],
    demoUrl: "https://www.youtube.com/watch?v=pCrAT9o2Pys",
    description: "Pick up heavy dumbbells or kettlebells in both hands and walk for distance. Keep posture tall, shoulders packed. Builds grip, core stability, and total-body strength.",
  },
  {
    name: "Pallof Press",
    movementTypes: [MovementType.CORE],
    muscleGroups: [MuscleGroup.CORE],
    demoUrl: "https://www.youtube.com/watch?v=y1fOBVtANdM",
    description: "In a half-kneeling position beside a cable stack, press the handle directly in front of your chest and return. Anti-rotation core stability drill.",
  },
  {
    name: "Reverse Nordics",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.LEGS],
    demoUrl: "https://www.youtube.com/watch?v=IryYHHJa1WE",
    description: "Kneel on a mat with feet anchored, lean back slowly while keeping hips extended. Bodyweight quad isolation; go as low as control allows.",
  },
];

async function main() {
  console.log("📦 Upserting exercises (skipping existing ones)...\n");

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin user found.");

  let created = 0;
  let skipped = 0;

  for (const ex of exercises) {
    const existing = await prisma.exercise.findFirst({
      where: { name: { equals: ex.name, mode: "insensitive" } },
    });

    if (existing) {
      // Update demoUrl and metadata in case they differ
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          demoUrl: ex.demoUrl,
          movementTypes: ex.movementTypes,
          muscleGroups: ex.muscleGroups,
        },
      });
      console.log(`  ↩  Already exists (updated metadata): "${ex.name}"`);
      skipped++;
    } else {
      const slugId = `ex-${ex.name.toLowerCase().replace(/[\s()\/]+/g, "-").replace(/-+/g, "-").replace(/-$/, "")}`;
      await prisma.exercise.create({
        data: {
          id: slugId,
          name: ex.name,
          description: ex.description,
          demoUrl: ex.demoUrl,
          status: ExerciseStatus.APPROVED,
          submittedById: admin.id,
          approvedById: admin.id,
          approvedAt: new Date(),
          movementTypes: ex.movementTypes,
          muscleGroups: ex.muscleGroups,
        },
      });
      console.log(`  ➕ Created: "${ex.name}"`);
      created++;
    }
  }

  console.log(`\n🎉 Done. ${created} created, ${skipped} already existed (metadata refreshed).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
