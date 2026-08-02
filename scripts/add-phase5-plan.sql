-- ============================================================
-- Add Core & Canopy Phase 5 (Canopy Overdrive) for dibbiny
-- Weeks 18-21, Mon/Wed/Fri split
-- Also creates 3 new exercises: Landmine Press, Weighted Push-Ups, Hammer Curls
-- ============================================================

DO $$
DECLARE
  user_id   TEXT;
  admin_id  TEXT;
  plan_id   TEXT;
  day_id    TEXT;
  week      INT;

  -- Exercise IDs
  ex_low_incline_db_press     TEXT;
  ex_landmine_press           TEXT;
  ex_cable_lateral_raises     TEXT;
  ex_cable_tricep_pushdowns   TEXT;
  ex_weighted_push_ups        TEXT;
  ex_meadows_rows             TEXT;
  ex_kneeling_cable_pullovers TEXT;
  ex_incline_db_curls         TEXT;
  ex_hammer_curls             TEXT;
  ex_strict_face_pulls        TEXT;
  ex_bulgarian_split_squats   TEXT;
  ex_dumbbell_rdls            TEXT;
  ex_ab_wheel_rollouts        TEXT;
  ex_suitcase_carries         TEXT;
  ex_dead_hangs               TEXT;

BEGIN
  -- ── 1. Get user & admin IDs ──────────────────────────────
  SELECT id INTO user_id  FROM users WHERE username = 'dibbiny' LIMIT 1;
  SELECT id INTO admin_id FROM users WHERE role = 'ADMIN'       LIMIT 1;
  IF user_id  IS NULL THEN RAISE EXCEPTION 'User "dibbiny" not found'; END IF;
  IF admin_id IS NULL THEN RAISE EXCEPTION 'No admin user found'; END IF;
  RAISE NOTICE 'User: %', user_id;

  -- ── 2. Create missing exercises ───────────────────────────

  -- Landmine Press
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(name) = 'landmine press') THEN
    INSERT INTO exercises (id, name, description, "demoUrl", status, "submittedById", "approvedById", "approvedAt", "createdAt", "movementTypes", "muscleGroups")
    VALUES (
      'ex-landmine-press',
      'Landmine Press',
      'Load one end of a barbell into a corner (or landmine attachment). Stand in a staggered stance, grip the sleeve with both hands (or one hand), and press it up and forward in an arc. Lean slightly into the movement for continuous tension. Great for shoulder and upper-chest development with lower joint stress.',
      'https://www.youtube.com/watch?v=sLvDpfO6aYw',
      'APPROVED', admin_id, admin_id, NOW(), NOW(),
      ARRAY['PUSH']::"MovementType"[],
      ARRAY['SHOULDERS', 'CHEST']::"MuscleGroup"[]
    );
    RAISE NOTICE 'Created: Landmine Press';
  ELSE
    RAISE NOTICE 'Skipped: Landmine Press';
  END IF;

  -- Weighted Push-Ups
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(name) = 'weighted push-ups') THEN
    INSERT INTO exercises (id, name, description, "demoUrl", status, "submittedById", "approvedById", "approvedAt", "createdAt", "movementTypes", "muscleGroups")
    VALUES (
      'ex-weighted-push-ups',
      'Weighted Push-Ups',
      'Standard push-up with a weight plate on your upper back (or a weighted vest). Descend chest to floor, then press up explosively. Used as a finisher — rep out to failure.',
      'https://www.youtube.com/watch?v=0pkjOk0EiAk',
      'APPROVED', admin_id, admin_id, NOW(), NOW(),
      ARRAY['PUSH']::"MovementType"[],
      ARRAY['CHEST', 'SHOULDERS', 'ARMS']::"MuscleGroup"[]
    );
    RAISE NOTICE 'Created: Weighted Push-Ups';
  ELSE
    RAISE NOTICE 'Skipped: Weighted Push-Ups';
  END IF;

  -- Hammer Curls
  IF NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(name) = 'hammer curls') THEN
    INSERT INTO exercises (id, name, description, "demoUrl", status, "submittedById", "approvedById", "approvedAt", "createdAt", "movementTypes", "muscleGroups")
    VALUES (
      'ex-hammer-curls',
      'Hammer Curls',
      'Stand holding dumbbells with a neutral (hammer) grip, palms facing each other. Curl both dumbbells simultaneously keeping the neutral grip throughout. Targets the brachialis and brachioradialis for forearm and bicep thickness.',
      'https://www.youtube.com/watch?v=TwD-YGVP4Bk',
      'APPROVED', admin_id, admin_id, NOW(), NOW(),
      ARRAY['PULL']::"MovementType"[],
      ARRAY['ARMS']::"MuscleGroup"[]
    );
    RAISE NOTICE 'Created: Hammer Curls';
  ELSE
    RAISE NOTICE 'Skipped: Hammer Curls';
  END IF;

  -- ── 3. Resolve all exercise IDs ──────────────────────────
  SELECT id INTO ex_low_incline_db_press     FROM exercises WHERE LOWER(name) = 'low-incline db press'      LIMIT 1;
  SELECT id INTO ex_landmine_press           FROM exercises WHERE LOWER(name) = 'landmine press'             LIMIT 1;
  SELECT id INTO ex_cable_lateral_raises     FROM exercises WHERE LOWER(name) = 'cable lateral raises'       LIMIT 1;
  SELECT id INTO ex_cable_tricep_pushdowns   FROM exercises WHERE LOWER(name) = 'cable tricep pushdowns'     LIMIT 1;
  SELECT id INTO ex_weighted_push_ups        FROM exercises WHERE LOWER(name) = 'weighted push-ups'          LIMIT 1;
  SELECT id INTO ex_meadows_rows             FROM exercises WHERE LOWER(name) = 'meadows rows'               LIMIT 1;
  SELECT id INTO ex_kneeling_cable_pullovers FROM exercises WHERE LOWER(name) = 'kneeling cable pullovers'   LIMIT 1;
  SELECT id INTO ex_incline_db_curls         FROM exercises WHERE LOWER(name) = 'incline db curls'           LIMIT 1;
  SELECT id INTO ex_hammer_curls             FROM exercises WHERE LOWER(name) = 'hammer curls'               LIMIT 1;
  SELECT id INTO ex_strict_face_pulls        FROM exercises WHERE LOWER(name) = 'strict face pulls'          LIMIT 1;
  SELECT id INTO ex_bulgarian_split_squats   FROM exercises WHERE LOWER(name) = 'bulgarian split squats'     LIMIT 1;
  SELECT id INTO ex_dumbbell_rdls            FROM exercises WHERE LOWER(name) = 'dumbbell rdls'              LIMIT 1;
  SELECT id INTO ex_ab_wheel_rollouts        FROM exercises WHERE LOWER(name) = 'ab wheel rollouts'          LIMIT 1;
  -- "Heavy Suitcase Carries" → look for "suitcase carries"
  SELECT id INTO ex_suitcase_carries         FROM exercises WHERE LOWER(name) LIKE '%suitcase carries%'      LIMIT 1;
  -- "Dead Hangs" → fall back to "weighted dead hangs"
  SELECT id INTO ex_dead_hangs               FROM exercises WHERE LOWER(name) LIKE '%dead hang%'             LIMIT 1;

  -- Validate
  IF ex_low_incline_db_press     IS NULL THEN RAISE EXCEPTION 'Missing: Low-Incline DB Press'; END IF;
  IF ex_landmine_press           IS NULL THEN RAISE EXCEPTION 'Missing: Landmine Press'; END IF;
  IF ex_cable_lateral_raises     IS NULL THEN RAISE EXCEPTION 'Missing: Cable Lateral Raises'; END IF;
  IF ex_cable_tricep_pushdowns   IS NULL THEN RAISE EXCEPTION 'Missing: Cable Tricep Pushdowns'; END IF;
  IF ex_weighted_push_ups        IS NULL THEN RAISE EXCEPTION 'Missing: Weighted Push-Ups'; END IF;
  IF ex_meadows_rows             IS NULL THEN RAISE EXCEPTION 'Missing: Meadows Rows'; END IF;
  IF ex_kneeling_cable_pullovers IS NULL THEN RAISE EXCEPTION 'Missing: Kneeling Cable Pullovers'; END IF;
  IF ex_incline_db_curls         IS NULL THEN RAISE EXCEPTION 'Missing: Incline DB Curls'; END IF;
  IF ex_hammer_curls             IS NULL THEN RAISE EXCEPTION 'Missing: Hammer Curls'; END IF;
  IF ex_strict_face_pulls        IS NULL THEN RAISE EXCEPTION 'Missing: Strict Face Pulls'; END IF;
  IF ex_bulgarian_split_squats   IS NULL THEN RAISE EXCEPTION 'Missing: Bulgarian Split Squats'; END IF;
  IF ex_dumbbell_rdls            IS NULL THEN RAISE EXCEPTION 'Missing: Dumbbell RDLs'; END IF;
  IF ex_ab_wheel_rollouts        IS NULL THEN RAISE EXCEPTION 'Missing: Ab Wheel Rollouts'; END IF;
  IF ex_suitcase_carries         IS NULL THEN RAISE EXCEPTION 'Missing: Suitcase Carries'; END IF;
  IF ex_dead_hangs               IS NULL THEN RAISE EXCEPTION 'Missing: Dead Hangs / Weighted Dead Hangs'; END IF;

  RAISE NOTICE 'All exercises resolved OK';

  -- ── 4. Create the Training Plan ─────────────────────────
  plan_id := gen_random_uuid()::TEXT;

  INSERT INTO training_plans (
    id, title, description, "durationWeeks", visibility,
    "starRatingSum", "starRatingCount", "createdAt", "updatedAt", "creatorId"
  ) VALUES (
    plan_id,
    'Core & Canopy: Phase 5 (Canopy Overdrive)',
    E'Focus: Upper Body Aesthetics, Massive Pumps, and Enjoying the Gym.\nPhase: Weeks 18-21.\n\nPhilosophy: Modified Push / Pull / Foundation split. Two full days dedicated to maximising upper body aesthetics (chest, back, shoulders, arms) and one efficient lower body/core day to keep the engine running smoothly.\n\nPHASE 5 MINDSET:\n- Have Fun: chase the pump on Days 1 and 2.\n- Day 3 is quick. If not feeling it, just hit Ab Wheel and Carries to protect your spine and go home.\n\nREST-PAUSE (Day 1 Cable Lateral Raises, last set): go to failure, rest 15s, same weight to failure, rest 15s, one final push.',
    4,
    'PRIVATE',
    0, 0,
    NOW(), NOW(),
    user_id
  );

  RAISE NOTICE 'Plan created: %', plan_id;

  -- ── 5. Create Plan Days for Weeks 18–21 ─────────────────
  FOR week IN 18..21 LOOP

    -- ── DAY 1: The Front Canopy – Push & Shoulders (Monday = 0) ──
    INSERT INTO plan_days (id, "dayOfWeek", "weekNumber", label, "planId")
    VALUES (gen_random_uuid()::TEXT, 0, week, 'Day 1 – The Front Canopy (Push & Shoulders)', plan_id)
    RETURNING id INTO day_id;

    INSERT INTO plan_day_exercises (id, "orderIndex", sets, reps, "restSeconds", "planDayId", "exerciseId") VALUES
      (gen_random_uuid()::TEXT, 0, 4, 7,  120, day_id, ex_low_incline_db_press),    -- 6–8 → 7
      (gen_random_uuid()::TEXT, 1, 3, 9,   90, day_id, ex_landmine_press),          -- 8–10 → 9
      (gen_random_uuid()::TEXT, 2, 4, 13,  60, day_id, ex_cable_lateral_raises),    -- 12–15 → 13 (Rest-Pause last set)
      (gen_random_uuid()::TEXT, 3, 3, 13,  90, day_id, ex_cable_tricep_pushdowns),  -- 12–15 → 13
      (gen_random_uuid()::TEXT, 4, 2, 10,  90, day_id, ex_weighted_push_ups);       -- to failure ~10

    -- ── DAY 2: The Back Span – Pull & Arms (Wednesday = 2) ──
    INSERT INTO plan_days (id, "dayOfWeek", "weekNumber", label, "planId")
    VALUES (gen_random_uuid()::TEXT, 2, week, 'Day 2 – The Back Span (Pull & Arms)', plan_id)
    RETURNING id INTO day_id;

    INSERT INTO plan_day_exercises (id, "orderIndex", sets, reps, "restSeconds", "planDayId", "exerciseId") VALUES
      (gen_random_uuid()::TEXT, 0, 4, 9,  120, day_id, ex_meadows_rows),             -- 8–10/s → 9
      (gen_random_uuid()::TEXT, 1, 3, 12,  90, day_id, ex_kneeling_cable_pullovers),
      (gen_random_uuid()::TEXT, 2, 4, 9,   90, day_id, ex_incline_db_curls),         -- 8–10 → 9
      (gen_random_uuid()::TEXT, 3, 2, 12,  90, day_id, ex_hammer_curls),
      (gen_random_uuid()::TEXT, 4, 3, 15,  60, day_id, ex_strict_face_pulls);

    -- ── DAY 3: Quick Foundation – Core & Legs (Friday = 4) ──
    INSERT INTO plan_days (id, "dayOfWeek", "weekNumber", label, "planId")
    VALUES (gen_random_uuid()::TEXT, 4, week, 'Day 3 – Quick Foundation (Core & Legs)', plan_id)
    RETURNING id INTO day_id;

    INSERT INTO plan_day_exercises (id, "orderIndex", sets, reps, "restSeconds", "planDayId", "exerciseId") VALUES
      (gen_random_uuid()::TEXT, 0, 3, 8,  120, day_id, ex_bulgarian_split_squats),  -- 8/s
      (gen_random_uuid()::TEXT, 1, 3, 10,  90, day_id, ex_dumbbell_rdls),
      (gen_random_uuid()::TEXT, 2, 3, 11,  60, day_id, ex_ab_wheel_rollouts),       -- 10–12 → 11
      (gen_random_uuid()::TEXT, 3, 3, 1,   90, day_id, ex_suitcase_carries),        -- 1 rep = 40m/side
      (gen_random_uuid()::TEXT, 4, 2, 1,   90, day_id, ex_dead_hangs);              -- 1 rep = 45s hang

    RAISE NOTICE 'Week % created OK', week;
  END LOOP;

  RAISE NOTICE 'Phase 5 plan created! Plan ID: %', plan_id;

END $$;
