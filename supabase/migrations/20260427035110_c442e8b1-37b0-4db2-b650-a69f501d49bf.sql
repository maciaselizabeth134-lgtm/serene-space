
-- 1) pet_state
CREATE TABLE public.pet_state (
  user_id UUID NOT NULL PRIMARY KEY,
  food INTEGER NOT NULL DEFAULT 3,
  satiety INTEGER NOT NULL DEFAULT 6,
  last_satiety_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_fed_at TIMESTAMPTZ,
  last_break_at TIMESTAMPTZ,
  total_fed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_state_select_own" ON public.pet_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pet_state_insert_own" ON public.pet_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pet_state_update_own" ON public.pet_state
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pet_state_delete_own" ON public.pet_state
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER pet_state_set_updated_at
  BEFORE UPDATE ON public.pet_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) pet_rewards (per-day caps)
CREATE TABLE public.pet_rewards (
  user_id UUID NOT NULL,
  reward_date DATE NOT NULL,
  source TEXT NOT NULL, -- 'checkin' | 'post' | 'comment'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reward_date, source)
);

ALTER TABLE public.pet_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_rewards_select_own" ON public.pet_rewards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- inserts only via SECURITY DEFINER trigger; no client insert policy needed

-- 3) helper: ensure pet_state row exists for the user (uses SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.ensure_pet_state(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pet_state (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_pet_state(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_pet_state(UUID) TO authenticated;

-- 4) Trigger: award food on checkin / post / comment (1 per source per day)
CREATE OR REPLACE FUNCTION public.award_pet_food()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src TEXT;
  uid UUID;
  today DATE := CURRENT_DATE;
  inserted BOOLEAN := false;
BEGIN
  uid := NEW.user_id;
  IF TG_TABLE_NAME = 'checkins' THEN
    src := 'checkin';
  ELSIF TG_TABLE_NAME = 'posts' THEN
    src := 'post';
  ELSIF TG_TABLE_NAME = 'comments' THEN
    src := 'comment';
  ELSE
    RETURN NEW;
  END IF;

  -- ensure state row
  INSERT INTO public.pet_state (user_id) VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  -- try to insert reward row; if already there for this day+source, skip
  BEGIN
    INSERT INTO public.pet_rewards (user_id, reward_date, source)
    VALUES (uid, today, src);
    inserted := true;
  EXCEPTION WHEN unique_violation THEN
    inserted := false;
  END;

  IF inserted THEN
    UPDATE public.pet_state
      SET food = food + 1
      WHERE user_id = uid;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_pet_food() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_award_food_checkin
  AFTER INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.award_pet_food();

CREATE TRIGGER trg_award_food_post
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.award_pet_food();

CREATE TRIGGER trg_award_food_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.award_pet_food();

-- 5) Trigger: on profile reset (quit_start_date changes), satiety -3
CREATE OR REPLACE FUNCTION public.handle_quit_reset()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quit_start_date IS DISTINCT FROM OLD.quit_start_date THEN
    INSERT INTO public.pet_state (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.pet_state
      SET satiety = GREATEST(0, satiety - 3),
          last_break_at = now()
      WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_quit_reset() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_profile_quit_reset
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_quit_reset();
