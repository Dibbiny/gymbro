-- ============================================================
-- Upsert Level 2/3 exercises for gymbro
-- Safe to run multiple times — skips existing names
-- ============================================================

DO $$
DECLARE
  admin_id TEXT;
BEGIN
  SELECT id INTO admin_id FROM users WHERE role = 'ADMIN' LIMIT 1;

  -- 1. Heavy DB Rows
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(name) = 'heavy db rows') THEN
    INSERT INTO exercises (id, name, description, "demoUrl", status, "submittedById", "approvedById", "approvedAt", "createdAt", "movementTypes", "muscleGroups")
    VALUES (
      'ex-heavy-db-rows',
      'Heavy DB Rows',
      'Brace one hand on a bench, row a heavy dumbbell explosively to your hip. Focus on driving the elbow back and squeezing the lat at the top.',
      'https://www.youtube.com/watch?v=g4E5goYVeYs',
      'APPROVED', admin_id, admin_id, NOW(), NOW(),
      ARRAY['PULL']::"MovementType"[],
      ARRAY['BACK']::"MuscleGroup"[]
    );
    RAISE NOTICE 'Created: Heavy DB Rows';
  ELSE
    RAISE NOTICE 'Skipped (exists): Heavy DB Rows';
  END IF;

  -- 2. Kneeling Cable Pullovers
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(name) = 'kneeling cable pullovers') THEN
    INSERT INTO exercises (id, name, description, "demoUrl", status, "submittedById", "approvedById", "approvedAt", "createdAt", "movementTypes", "muscleGroups")
    VALUES (
      'ex-kneeling-cable-pullovers',
      'Kneeling Cable Pullovers',
      'Kneel facing a high cable pulley, arms extended overhead. Pull the cable down in an arc until your hands reach your hips. Excellent lat isolation with constant tension.',
      'https://www.youtube.com/watch?v=mv02Qbiwhbo',
      'APPROVED', admin_id, admin_id, NOW(), NOW(),
      ARRAY['PULL']::"MovementType"[],
      ARRAY['BACK']::"MuscleGroup"[]
    );
    RAISE NOTICE 'Created: Kneeling Cable Pullovers';
  ELSE
    RAISE NOTICE 'Skipped (exists): Kneeling Cable Pullovers';
  END IF;

  -- 3. Strict Face Pulls
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(name) = 'strict face pulls') THEN
    INSERT INTO exercises (id, name, description, "demoUrl", status, "submittedById", "approvedById", "approvedAt", "createdAt", "movementTypes", "muscleGroups")
    VALUES (
      'ex-strict-face-pulls',
      'Strict Face Pulls',
      'Attach a rope to a high cable. Pull the rope to forehead level with elbows high and wide. Strict form: no momentum, keep weight controlled at 15–20 kg max.',
      'https://www.youtube.com/watch?v=rep-qVOkqgk',
      'APPROVED', admin_id, admin_id, NOW(), NOW(),
      ARRAY['PULL']::"MovementType"[],
      ARRAY['SHOULDERS', 'BACK']::"MuscleGroup"[]
    );
    RAISE NOTICE 'Created: Strict Face Pulls';
  ELSE
    RAISE NOTICE 'Skipped (exists): Strict Face Pulls';
  END IF;

  -- 4. Incline DB Curls (already exists from Level 3, but update demoUrl just in case)
  UPDATE exercises
  SET "demoUrl" = 'https://www.youtube.com/watch?v=uZ7JZ8Lx51s'
  WHERE LOWER(name) = 'incline db curls';
  RAISE NOTICE 'Updated demoUrl: Incline DB Curls';

  -- 5. Weighted Dead Hangs (already exists, update demoUrl)
  UPDATE exercises
  SET "demoUrl" = 'https://www.youtube.com/watch?v=1uTplND3Z64'
  WHERE LOWER(name) = 'weighted dead hangs';
  RAISE NOTICE 'Updated demoUrl: Weighted Dead Hangs';

  -- 6. Seated DB Shoulder Press
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(name) = 'seated db shoulder press') THEN
    INSERT INTO exercises (id, name, description, "demoUrl", status, "submittedById", "approvedById", "approvedAt", "createdAt", "movementTypes", "muscleGroups")
    VALUES (
      'ex-seated-db-shoulder-press',
      'Seated DB Shoulder Press',
      'Sit upright on a bench, press dumbbells from shoulder height directly overhead. Controls scapular movement better than standing variations.',
      'https://www.youtube.com/watch?v=TsduLWuhlFM',
      'APPROVED', admin_id, admin_id, NOW(), NOW(),
      ARRAY['PUSH']::"MovementType"[],
      ARRAY['SHOULDERS']::"MuscleGroup"[]
    );
    RAISE NOTICE 'Created: Seated DB Shoulder Press';
  ELSE
    RAISE NOTICE 'Skipped (exists): Seated DB Shoulder Press';
  END IF;

  -- 7. Cable Tricep Pushdowns
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(name) = 'cable tricep pushdowns') THEN
    INSERT INTO exercises (id, name, description, "demoUrl", status, "submittedById", "approvedById", "approvedAt", "createdAt", "movementTypes", "muscleGroups")
    VALUES (
      'ex-cable-tricep-pushdowns',
      'Cable Tricep Pushdowns',
      'Attach a bar or rope to a high cable. Keep elbows pinned to your sides and push the cable down until arms are fully extended. Squeeze the triceps at the bottom.',
      'https://www.youtube.com/watch?v=e60EKJzv2Go',
      'APPROVED', admin_id, admin_id, NOW(), NOW(),
      ARRAY['PUSH']::"MovementType"[],
      ARRAY['ARMS']::"MuscleGroup"[]
    );
    RAISE NOTICE 'Created: Cable Tricep Pushdowns';
  ELSE
    RAISE NOTICE 'Skipped (exists): Cable Tricep Pushdowns';
  END IF;

  -- 8. Dumbbell RDLs
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(name) = 'dumbbell rdls') THEN
    INSERT INTO exercises (id, name, description, "demoUrl", status, "submittedById", "approvedById", "approvedAt", "createdAt", "movementTypes", "muscleGroups")
    VALUES (
      'ex-dumbbell-rdls',
      'Dumbbell RDLs',
      'Hold dumbbells in front of your thighs, hinge at the hips with a soft bend in the knees, lowering the weights along your legs until you feel a deep hamstring stretch, then drive back up.',
      'https://www.youtube.com/watch?v=_DhDkij1vxY',
      'APPROVED', admin_id, admin_id, NOW(), NOW(),
      ARRAY['PULL']::"MovementType"[],
      ARRAY['LEGS']::"MuscleGroup"[]
    );
    RAISE NOTICE 'Created: Dumbbell RDLs';
  ELSE
    RAISE NOTICE 'Skipped (exists): Dumbbell RDLs';
  END IF;

  -- 9. Heavy Farmer's Carries
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(name) = 'heavy farmer''s carries') THEN
    INSERT INTO exercises (id, name, description, "demoUrl", status, "submittedById", "approvedById", "approvedAt", "createdAt", "movementTypes", "muscleGroups")
    VALUES (
      'ex-heavy-farmers-carries',
      'Heavy Farmer''s Carries',
      'Pick up heavy dumbbells or kettlebells in both hands and walk for distance. Keep posture tall, shoulders packed. Builds grip, core stability, and total-body strength.',
      'https://www.youtube.com/watch?v=pCrAT9o2Pys',
      'APPROVED', admin_id, admin_id, NOW(), NOW(),
      ARRAY['CORE']::"MovementType"[],
      ARRAY['CORE', 'ARMS']::"MuscleGroup"[]
    );
    RAISE NOTICE 'Created: Heavy Farmer''s Carries';
  ELSE
    RAISE NOTICE 'Skipped (exists): Heavy Farmer''s Carries';
  END IF;

  -- Low-Incline DB Press, Cable Lateral Raises, Ab Wheel Rollouts,
  -- Bulgarian Split Squats, Pallof Press, Reverse Nordics
  -- → already exist from Level 3; just update their demoUrls to the new links
  UPDATE exercises SET "demoUrl" = 'https://www.youtube.com/watch?v=8iPEnn-ltC8'  WHERE LOWER(name) = 'low-incline db press';
  UPDATE exercises SET "demoUrl" = 'https://www.youtube.com/watch?v=L2Ffu3rHgKw'  WHERE LOWER(name) = 'cable lateral raises';
  UPDATE exercises SET "demoUrl" = 'https://www.youtube.com/watch?v=_BHKT60P6bc'  WHERE LOWER(name) = 'ab wheel rollouts';
  UPDATE exercises SET "demoUrl" = 'https://www.youtube.com/watch?v=2C-uNgKwPLE'  WHERE LOWER(name) = 'bulgarian split squats';
  UPDATE exercises SET "demoUrl" = 'https://www.youtube.com/watch?v=y1fOBVtANdM'  WHERE LOWER(name) = 'pallof press';
  UPDATE exercises SET "demoUrl" = 'https://www.youtube.com/watch?v=IryYHHJa1WE'  WHERE LOWER(name) = 'reverse nordics';
  RAISE NOTICE 'Updated demoUrls for existing Level 3 exercises';

END $$;
