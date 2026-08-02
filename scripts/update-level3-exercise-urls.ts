import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const updates: { name: string; demoUrl: string }[] = [
  { name: "Meadows Rows",        demoUrl: "http://www.youtube.com/watch?v=Ovh16HtL8us" },
  { name: "Bird-Dog Rows",       demoUrl: "http://www.youtube.com/watch?v=ryAdpEkSJKs" },
  { name: "Incline DB Curls",    demoUrl: "http://www.youtube.com/watch?v=xaD04rphchk" },
  { name: "Weighted Dead Hangs", demoUrl: "http://www.youtube.com/watch?v=Rwu4wbSO_DA" },
  { name: "Low-Incline DB Press",demoUrl: "http://www.youtube.com/watch?v=8iPEnn-ltC8" },
  { name: "Arnold Press",        demoUrl: "http://www.youtube.com/watch?v=6Z15_WdXmVw" },
  { name: "Cable Lateral Raises",demoUrl: "http://www.youtube.com/watch?v=L2Ffu3rHgKw" },
  { name: "DB Skullcrushers",    demoUrl: "http://www.youtube.com/watch?v=cK4Ekcyk3QE" },
  { name: "Ab Wheel Rollouts",   demoUrl: "http://www.youtube.com/watch?v=_BHKT60P6bc" },
  { name: "Deficit Push-Ups",    demoUrl: "http://www.youtube.com/watch?v=Jd_W_wBlzqY" },
  { name: "Suitcase Carries",    demoUrl: "http://www.youtube.com/watch?v=SPB3VE-zDUI" },
  { name: "Reverse Nordics",     demoUrl: "http://www.youtube.com/watch?v=IryYHHJa1WE" },
];

async function main() {
  console.log("🔗 Updating demoUrls for Level 3 exercises...\n");

  for (const { name, demoUrl } of updates) {
    const exercise = await prisma.exercise.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (!exercise) {
      console.warn(`  ⚠  Not found: "${name}"`);
      continue;
    }

    await prisma.exercise.update({
      where: { id: exercise.id },
      data: { demoUrl },
    });

    console.log(`  ✅ Updated: "${name}"`);
  }

  console.log("\n🎉 All exercise URLs updated.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
