-- ============================================================
-- Add "Core & Canopy: Phase 4" plan for dibbiny
-- Weeks 14–17, Mon/Wed/Fri split
-- Safe to run once — creates a new plan each time
-- ============================================================

DO $$
DECLARE
  user_id       TEXT;
  plan_id       TEXT;
  day_id        TEXT;
  week          INT;

  -- Exercise IDs (looked up by name)
  ex_heavy_db_rows            TEXT;
  ex_kneeling_cable_pullovers TEXT;
  ex_strict_face_pulls        TEXT;
  ex_incline_db_curls         TEXT;
  ex_weighted_dead_hangs      TEXT;
  ex_low_incline_db_press     TEXT;
  ex_seated_db_shoulder_press TEXT;
  ex_cable_lateral_raises     TEXT;
  ex_cable_tricep_pushdowns   TEXT;
  ex_ab_wheel_rollouts        TEXT;
  ex_bulgarian_split_squats   TEXT;
  ex_dumbbell_rdls            TEXT;
  ex_heavy_farmers_carries    TEXT;
  ex_pallof_press             TEXT;
  ex_reverse_nordics          TEXT;

BEGIN
  -- ── 1. Get dibbiny's user ID ─────────────────────────────
  SELECT id INTO user_id FROM users WHERE username = 'dibbiny';
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User "dibbiny" not found';
  END IF;
  RAISE NOTICE 'User ID: %', user_id;

  -- ── 2. Resolve exercise IDs ──────────────────────────────
  SELECT id INTO ex_heavy_db_rows            FROM exercises WHERE LOWER(name) = 'heavy db rows'             LIMIT 1;
  SELECT id INTO ex_kneeling_cable_pullovers FROM exercises WHERE LOWER(name) = 'kneeling cable pullovers'  LIMIT 1;
  SELECT id INTO ex_strict_face_pulls        FROM exercises WHERE LOWER(name) = 'strict face pulls'         LIMIT 1;
  SELECT id INTO ex_incline_db_curls         FROM exercises WHERE LOWER(name) = 'incline db curls'          LIMIT 1;
  SELECT id INTO ex_weighted_dead_hangs      FROM exercises WHERE LOWER(name) = 'weighted dead hangs'       LIMIT 1;
  SELECT id INTO ex_low_incline_db_press     FROM exercises WHERE LOWER(name) = 'low-incline db press'      LIMIT 1;
  SELECT id INTO ex_seated_db_shoulder_press FROM exercises WHERE LOWER(name) = 'seated db shoulder press'  LIMIT 1;
  SELECT id INTO ex_cable_lateral_raises     FROM exercises WHERE LOWER(name) = 'cable lateral raises'      LIMIT 1;
  SELECT id INTO ex_cable_tricep_pushdowns   FROM exercises WHERE LOWER(name) = 'cable tricep pushdowns'    LIMIT 1;
  SELECT id INTO ex_ab_wheel_rollouts        FROM exercises WHERE LOWER(name) = 'ab wheel rollouts'         LIMIT 1;
  SELECT id INTO ex_bulgarian_split_squats   FROM exercises WHERE LOWER(name) = 'bulgarian split squats'    LIMIT 1;
  SELECT id INTO ex_dumbbell_rdls            FROM exercises WHERE LOWER(name) = 'dumbbell rdls'             LIMIT 1;
  SELECT id INTO ex_heavy_farmers_carries    FROM exercises WHERE LOWER(name) = 'heavy farmer''s carries'   LIMIT 1;
  SELECT id INTO ex_pallof_press             FROM exercises WHERE LOWER(name) = 'pallof press'              LIMIT 1;
  SELECT id INTO ex_reverse_nordics          FROM exercises WHERE LOWER(name) = 'reverse nordics'           LIMIT 1;

  -- Validate all exercises found
  IF ex_heavy_db_rows            IS NULL THEN RAISE EXCEPTION 'Exercise not found: Heavy DB Rows'; END IF;
  IF ex_kneeling_cable_pullovers IS NULL THEN RAISE EXCEPTION 'Exercise not found: Kneeling Cable Pullovers'; END IF;
  IF ex_strict_face_pulls        IS NULL THEN RAISE EXCEPTION 'Exercise not found: Strict Face Pulls'; END IF;
  IF ex_incline_db_curls         IS NULL THEN RAISE EXCEPTION 'Exercise not found: Incline DB Curls'; END IF;
  IF ex_weighted_dead_hangs      IS NULL THEN RAISE EXCEPTION 'Exercise not found: Weighted Dead Hangs'; END IF;
  IF ex_low_incline_db_press     IS NULL THEN RAISE EXCEPTION 'Exercise not found: Low-Incline DB Press'; END IF;
  IF ex_seated_db_shoulder_press IS NULL THEN RAISE EXCEPTION 'Exercise not found: Seated DB Shoulder Press'; END IF;
  IF ex_cable_lateral_raises     IS NULL THEN RAISE EXCEPTION 'Exercise not found: Cable Lateral Raises'; END IF;
  IF ex_cable_tricep_pushdowns   IS NULL THEN RAISE EXCEPTION 'Exercise not found: Cable Tricep Pushdowns'; END IF;
  IF ex_ab_wheel_rollouts        IS NULL THEN RAISE EXCEPTION 'Exercise not found: Ab Wheel Rollouts'; END IF;
  IF ex_bulgarian_split_squats   IS NULL THEN RAISE EXCEPTION 'Exercise not found: Bulgarian Split Squats'; END IF;
  IF ex_dumbbell_rdls            IS NULL THEN RAISE EXCEPTION 'Exercise not found: Dumbbell RDLs'; END IF;
  IF ex_heavy_farmers_carries    IS NULL THEN RAISE EXCEPTION 'Exercise not found: Heavy Farmer''s Carries'; END IF;
  IF ex_pallof_press             IS NULL THEN RAISE EXCEPTION 'Exercise not found: Pallof Press'; END IF;
  IF ex_reverse_nordics          IS NULL THEN RAISE EXCEPTION 'Exercise not found: Reverse Nordics'; END IF;

  RAISE NOTICE 'All exercises resolved ✓';

  -- ── 3. Create the Training Plan ─────────────────────────
  plan_id := gen_random_uuid()::TEXT;

  INSERT INTO training_plans (
    id, title, description, "durationWeeks", visibility,
    "starRatingSum", "starRatingCount", "createdAt", "updatedAt", "creatorId"
  ) VALUES (
    plan_id,
    'Core & Canopy: Phase 4 (Peak Canopy & Aesthetics)',
    E'Focus: Maximum Muscle Volume, Rest-Pause Intensity, and Aesthetic "Pop".\nPhase: Weeks 14–17.\n\nPhilosophy: Boxing is out, so pure hypertrophy is the singular goal. We use your newly bulletproofed core to handle heavier weights and introduce Rest-Pause sets to push muscles to absolute exhaustion without spending 2 hours in the gym.\n\n🔥 REST-PAUSE RULE: On marked exercises (Incline DB Curls on Day 1, Cable Lateral Raises on Day 2 — final set only): go to failure → rest 15 seconds → same weight to failure → rest 15 seconds → one final push to failure.\n\n🦵 HAMSTRING INTEGRATION (Day 3 RDLs): Push hips backward like closing a car door with your glutes. Descend only until you feel a deep hamstring stretch, then squeeze glutes to stand. Keep the dumbbells sliding right down your legs.',
    4,
    'PRIVATE',
    0, 0,
    NOW(), NOW(),
    user_id
  );

  RAISE NOTICE 'Plan created: %', plan_id;

  -- ── 4. Create Plan Days for Weeks 14–17 ─────────────────
  FOR week IN 14..17 LOOP

    -- ── DAY 1: Posterior Width & Arm Density (Monday = 0) ──
    INSERT INTO plan_days (id, "dayOfWeek", "weekNumber", label, "planId")
    VALUES (gen_random_uuid()::TEXT, 0, week, 'Day 1 – Posterior Width & Arm Density', plan_id)
    RETURNING id INTO day_id;

    INSERT INTO plan_day_exercises (id, "orderIndex", sets, reps, "restSeconds", "planDayId", "exerciseId") VALUES
      (gen_random_uuid()::TEXT, 0, 3, 7,  120, day_id, ex_heavy_db_rows),            -- 6–8 → 7
      (gen_random_uuid()::TEXT, 1, 3, 13,  90, day_id, ex_kneeling_cable_pullovers), -- 12–15 → 13
      (gen_random_uuid()::TEXT, 2, 3, 15,  60, day_id, ex_strict_face_pulls),
      (gen_random_uuid()::TEXT, 3, 3, 9,   90, day_id, ex_incline_db_curls),         -- 8–10 → 9 (+ Rest-Pause last set)
      (gen_random_uuid()::TEXT, 4, 2, 1,   90, day_id, ex_weighted_dead_hangs);      -- 1 rep = 45s hold

    -- ── DAY 2: The "Canopy" Peak (Wednesday = 2) ───────────
    INSERT INTO plan_days (id, "dayOfWeek", "weekNumber", label, "planId")
    VALUES (gen_random_uuid()::TEXT, 2, week, 'Day 2 – The "Canopy" Peak', plan_id)
    RETURNING id INTO day_id;

    INSERT INTO plan_day_exercises (id, "orderIndex", sets, reps, "restSeconds", "planDayId", "exerciseId") VALUES
      (gen_random_uuid()::TEXT, 0, 3, 7,  120, day_id, ex_low_incline_db_press),     -- 6–8 → 7
      (gen_random_uuid()::TEXT, 1, 3, 9,   90, day_id, ex_seated_db_shoulder_press), -- 8–10 → 9
      (gen_random_uuid()::TEXT, 2, 4, 12,  60, day_id, ex_cable_lateral_raises),     -- 4th set = Rest-Pause
      (gen_random_uuid()::TEXT, 3, 3, 13,  90, day_id, ex_cable_tricep_pushdowns),   -- 12–15 → 13
      (gen_random_uuid()::TEXT, 4, 3, 11,  60, day_id, ex_ab_wheel_rollouts);        -- 10–12 → 11

    -- ── DAY 3: Foundation & Core Polish (Friday = 4) ───────
    INSERT INTO plan_days (id, "dayOfWeek", "weekNumber", label, "planId")
    VALUES (gen_random_uuid()::TEXT, 4, week, 'Day 3 – Foundation & Core Polish', plan_id)
    RETURNING id INTO day_id;

    INSERT INTO plan_day_exercises (id, "orderIndex", sets, reps, "restSeconds", "planDayId", "exerciseId") VALUES
      (gen_random_uuid()::TEXT, 0, 3, 9,  120, day_id, ex_bulgarian_split_squats),  -- 8–10 → 9
      (gen_random_uuid()::TEXT, 1, 3, 10,  90, day_id, ex_dumbbell_rdls),
      (gen_random_uuid()::TEXT, 2, 3, 1,   90, day_id, ex_heavy_farmers_carries),   -- 1 rep = 40m carry
      (gen_random_uuid()::TEXT, 3, 3, 12,  60, day_id, ex_pallof_press),
      (gen_random_uuid()::TEXT, 4, 2, 8,   90, day_id, ex_reverse_nordics);         -- to failure ~8

    RAISE NOTICE 'Week % created ✓', week;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Phase 4 plan fully created! Plan ID: %', plan_id;

END $$;
