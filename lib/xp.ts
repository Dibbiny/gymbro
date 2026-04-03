const XP_PER_SET = 10;

export function awardXP(setsCompleted: number): number {
  return setsCompleted * XP_PER_SET;
}

export function xpToLevel(xp: number): { level: number; progress: number; nextLevelXp: number } {
  // Level thresholds: each level requires 20% more XP than the previous
  // Level 1: 0, Level 2: 100, Level 3: 220, Level 4: 364...
  const BASE = 100;
  const MULTIPLIER = 1.2;

  let level = 1;
  let threshold = 0;
  let nextThreshold = BASE;

  while (xp >= nextThreshold) {
    level++;
    threshold = nextThreshold;
    nextThreshold = Math.floor(nextThreshold * MULTIPLIER);
  }

  const progress = Math.floor(((xp - threshold) / (nextThreshold - threshold)) * 100);
  return { level, progress, nextLevelXp: nextThreshold };
}
