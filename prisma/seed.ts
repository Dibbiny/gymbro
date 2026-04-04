import "dotenv/config";
import { PrismaClient, ExerciseStatus, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const exercises = [
  {
    name: "Bench Press",
    description:
      "Lie flat on a bench, grip the barbell slightly wider than shoulder-width, lower it to your chest, then press it back up.",
    categoryName: "Push",
  },
  {
    name: "Overhead Press",
    description:
      "Stand with feet shoulder-width apart, press a barbell from shoulder height directly overhead until arms are fully extended.",
    categoryName: "Push",
  },
  {
    name: "Lat Pulldown",
    description:
      "Sit at a cable machine, grip the bar wider than shoulder-width, and pull it down to your upper chest while keeping your torso upright.",
    categoryName: "Pull",
  },
  {
    name: "Squat",
    description:
      "Stand with feet shoulder-width apart, bar on your upper back, descend until thighs are parallel to the floor, then drive back up.",
    categoryName: "Legs",
  },
  {
    name: "Deadlift",
    description:
      "With a barbell on the floor, hinge at the hips, grip the bar just outside your legs, and lift by driving through your heels and extending your hips.",
    categoryName: "Lower Body",
  },
];

async function main() {
  console.log("Seeding database...");

  // Create a system/admin user to own the seed exercises
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

  // Seed exercises
  for (const ex of exercises) {
    // Find or create the category
    const category = await prisma.category.upsert({
      where: { name: ex.categoryName },
      update: {},
      create: { name: ex.categoryName },
    });

    const created = await prisma.exercise.upsert({
      where: {
        id: `seed-${ex.name.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: {},
      create: {
        id: `seed-${ex.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: ex.name,
        description: ex.description,
        status: ExerciseStatus.APPROVED,
        submittedById: admin.id,
        approvedById: admin.id,
        approvedAt: new Date(),
        categories: { connect: { id: category.id } },
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
