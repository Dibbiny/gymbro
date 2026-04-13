import "dotenv/config";
import { PrismaClient, ExerciseStatus, Role, MovementType, MuscleGroup } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const exercises: { name: string; description: string; movementTypes: MovementType[]; muscleGroups: MuscleGroup[] }[] = [
  {
    name: "Bench Press",
    description:
      "Lie flat on a bench, grip the barbell slightly wider than shoulder-width, lower it to your chest, then press it back up.",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.CHEST],
  },
  {
    name: "Overhead Press",
    description:
      "Stand with feet shoulder-width apart, press a barbell from shoulder height directly overhead until arms are fully extended.",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.SHOULDERS],
  },
  {
    name: "Lat Pulldown",
    description:
      "Sit at a cable machine, grip the bar wider than shoulder-width, and pull it down to your upper chest while keeping your torso upright.",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.BACK],
  },
  {
    name: "Squat",
    description:
      "Stand with feet shoulder-width apart, bar on your upper back, descend until thighs are parallel to the floor, then drive back up.",
    movementTypes: [MovementType.PUSH],
    muscleGroups: [MuscleGroup.LEGS],
  },
  {
    name: "Deadlift",
    description:
      "With a barbell on the floor, hinge at the hips, grip the bar just outside your legs, and lift by driving through your heels and extending your hips.",
    movementTypes: [MovementType.PULL],
    muscleGroups: [MuscleGroup.LEGS, MuscleGroup.BACK],
  },
];

async function main() {
  console.log("Seeding database...");

  const adminPasswordHash = await bcrypt.hash("admin123!", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@gymbro.app",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`Admin user: ${admin.username} (${admin.id})`);

  for (const ex of exercises) {
    const created = await prisma.exercise.upsert({
      where: { id: `seed-${ex.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `seed-${ex.name.toLowerCase().replace(/\s+/g, "-")}`,
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
    console.log(`Exercise: ${created.name}`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
