import "dotenv/config";
import { PrismaClient, MovementType, MuscleGroup } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const fixes: { name: string; movementTypes: MovementType[]; muscleGroups: MuscleGroup[] }[] = [
  {
    name: "Low-Incline DB Press",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.CHEST],
  },
  {
    name: "Deficit Push-Ups",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.CHEST],
  },
  {
    name: "Suitcase Carries",
    movementTypes: [MovementType.CORE],
    muscleGroups: [MuscleGroup.CORE, MuscleGroup.ARMS],
  },
];

async function main() {
  console.log("🔧 Fixing movement types & muscle groups...\n");

  for (const { name, movementTypes, muscleGroups } of fixes) {
    const exercise = await prisma.exercise.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (!exercise) {
      console.warn(`  ⚠  Not found: "${name}"`);
      continue;
    }

    await prisma.exercise.update({
      where: { id: exercise.id },
      data: { movementTypes, muscleGroups },
    });

    console.log(`  ✅ Fixed: "${name}" → [${movementTypes.join(", ")}] / [${muscleGroups.join(", ")}]`);
  }

  console.log("\n🎉 Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
