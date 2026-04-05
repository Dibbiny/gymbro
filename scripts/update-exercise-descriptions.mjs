import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const updates = [
  { name: "Barbell EZ-Bar Bicep Curls", description: "Bicep curls using an angled bar to reduce strain on the wrists.", demoUrl: "https://www.youtube.com/watch?v=zzQJmA2C9XY" },
  { name: "Bench Press", description: "The classic flat barbell press for overall chest and pushing power.", demoUrl: "https://www.youtube.com/shorts/0cXAp6WhSj4" },
  { name: "Bird-Dog Row", description: "Rowing a weight while on all fours with one leg extended to challenge core stability.", demoUrl: "https://www.youtube.com/watch?v=AG2MjYDdWVY" },
  { name: "Cable Crossovers / Flyes", description: "Bringing the arms together in a hugging motion using cables to isolate the pecs.", demoUrl: "https://www.youtube.com/watch?v=_sJ7hJ-FLps" },
  { name: "Chest-Supported Row", description: "Rowing while lying face-down on an incline bench to isolate the back.", demoUrl: "https://www.youtube.com/shorts/Mlr-Lx-10HQ" },
  { name: "Dead Bug", description: "Lying on your back and extending opposite limbs while keeping the lower back flat.", demoUrl: "https://www.youtube.com/shorts/Aoipu_fl3HA" },
  { name: "Dead Hangs", description: "Hanging completely relaxed from a pull-up bar to improve grip and stretch the back.", demoUrl: "https://www.youtube.com/watch?v=5dr9GnW1wrU" },
  { name: "Deadlift", description: "Lifting a heavy barbell from the floor to the hips, building the entire posterior chain.", demoUrl: "https://www.youtube.com/shorts/8np3vKDBJfc" },
  { name: "Dumbbell Press", description: "Flat bench pressing with dumbbells for better chest stretch and shoulder mobility.", demoUrl: "https://www.youtube.com/watch?v=jRUC6IVav30" },
  { name: "Face Pulls", description: "Pulling a cable rope to eye-level to strengthen the rear deltoids and rotator cuffs.", demoUrl: "https://www.youtube.com/shorts/ZBhK5Vzphc4" },
  { name: "Farmer's Carries", description: "Walking for distance or time while holding heavy dumbbells at your sides.", demoUrl: "https://www.youtube.com/watch?v=P79W3XdAi_4" },
  { name: "Goblet Squat", description: "Squatting while holding a single dumbbell or kettlebell vertically at chest level.", demoUrl: "https://www.youtube.com/shorts/7-80HiXX1K8" },
  { name: "Hammer Curls", description: "Bicep curls with a neutral (thumbs-up) grip to target the brachialis and forearms.", demoUrl: "https://www.youtube.com/watch?v=YKJIOM6CM0o" },
  { name: "Incline Dumbbell Press", description: "Pressing dumbbells on a 30-45 degree bench to target the upper chest.", demoUrl: "https://www.youtube.com/watch?v=wylLNWkY1MI" },
  { name: "Landmine Press", description: "Pressing a barbell anchored to the floor diagonally upward, great for shoulder health.", demoUrl: "https://www.youtube.com/watch?v=9OW4SONxuGI" },
  { name: "Lat Pulldown", description: "Pulling a cable bar down to the upper chest to target the lats (wide back muscles).", demoUrl: "https://www.youtube.com/shorts/02Qci1-0Aao" },
  { name: "Lateral Raises", description: "Raising dumbbells out to your sides to build the lateral (side) deltoids.", demoUrl: "https://www.youtube.com/watch?v=gYGUPfb3JpE" },
  { name: "Leg Extensions", description: "A seated machine exercise that strictly isolates the quadriceps by extending the knee.", demoUrl: "https://www.youtube.com/watch?v=hdpz7kKCHvE" },
  { name: "Leg Press", description: "Pushing a heavy sled upward with your legs using a seated 45-degree machine.", demoUrl: "https://www.youtube.com/watch?v=XNvaNipSycI" },
  { name: "Overhead Press", description: "A standing barbell press pushed vertically overhead to build shoulder mass.", demoUrl: "https://www.youtube.com/watch?v=-5MmFTKLC-0" },
  { name: "Overhead Tricep Extension", description: "Extending the arms upward from behind the head to target the long head of the triceps.", demoUrl: "https://www.youtube.com/watch?v=U45qzGXSpHU" },
  { name: "Pallof Press", description: "Pushing a cable handle straight out in front of you while resisting its sideways pull.", demoUrl: "https://www.youtube.com/watch?v=6wV02D5aAWA" },
  { name: "Pull-Ups (or Assisted Pull-Ups)", description: "Pulling your bodyweight up to a bar, engaging the lats, upper back, and biceps.", demoUrl: "https://www.youtube.com/shorts/l6-aIZTbAR0" },
  { name: "Romanian Deadlifts (RDLs)", description: "A \"hinge\" motion pushing the hips back with slightly bent knees to target the hamstrings.", demoUrl: "https://www.youtube.com/watch?v=2SHsk9AzdjA" },
  { name: "Seated Cable Row", description: "Pulling a cable attachment horizontally to your midsection to build back thickness.", demoUrl: "https://www.youtube.com/watch?v=OeLb503NZHk" },
  { name: "Seated Dumbbell Shoulder Press", description: "Pressing dumbbells overhead while seated on an upright bench for stability.", demoUrl: "https://www.youtube.com/watch?v=ko9YIBSgo9A" },
  { name: "Seated Leg Curls", description: "A machine exercise curling the lower legs downward and back to isolate hamstrings.", demoUrl: "https://www.youtube.com/watch?v=7gx65ukbLYg" },
  { name: "Single-Arm Dumbbell Rows", description: "Bracing on a bench and rowing a dumbbell with one arm to focus on lat activation.", demoUrl: "https://www.youtube.com/watch?v=SbZuFxuseys" },
  { name: "Squat", description: "The classic barbell back squat, building the entire lower body and core structure.", demoUrl: "https://www.youtube.com/shorts/CsPAsICeRsM" },
  { name: "Standing Calf Raises", description: "Pushing up onto the toes against resistance to build the gastrocnemius (calf muscle).", demoUrl: "https://www.youtube.com/watch?v=tFXMJWa5R0c" },
  { name: "Tricep Rope Pushdowns", description: "Pushing a rope attachment downward on a cable machine to isolate the triceps.", demoUrl: "https://www.youtube.com/watch?v=qS_aDZe6Qos" },
  { name: "Walking Lunges", description: "Taking deep consecutive steps forward, dropping the back knee toward the ground.", demoUrl: "https://www.youtube.com/watch?v=Pbmj6xPo-Hw" },
  { name: "Weighted Crunches", description: "Flexing the torso upward while holding a plate or dumbbell to build the abs.", demoUrl: "https://www.youtube.com/watch?v=_nzyLUvtgvs" },
  { name: "Weighted Push-Ups", description: "Standard push-ups performed with a weight plate resting on the upper back.", demoUrl: "https://www.youtube.com/shorts/z4oz6W1X10w" },
];

async function main() {
  for (const { name, description, demoUrl } of updates) {
    const exercise = await db.exercise.findFirst({ where: { name } });
    if (!exercise) {
      console.warn(`NOT FOUND: "${name}"`);
      continue;
    }
    await db.exercise.update({
      where: { id: exercise.id },
      data: { description, demoUrl },
    });
    console.log(`Updated: "${name}"`);
  }
  console.log("Done.");
}

main().catch(console.error).finally(() => db.$disconnect());
