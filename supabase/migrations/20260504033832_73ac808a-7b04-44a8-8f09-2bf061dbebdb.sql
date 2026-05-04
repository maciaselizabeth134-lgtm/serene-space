CREATE TABLE public.follows (
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_all" ON public.follows
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "follows_insert_own" ON public.follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own" ON public.follows
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);

-- notify on new follow
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id, target_type, target_id, content)
  VALUES (NEW.following_id, 'follow', NEW.follower_id, 'user', NEW.follower_id, '');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_on_follow
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- attach existing notification triggers if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_on_comment') THEN
    CREATE TRIGGER trg_notify_on_comment AFTER INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_on_like') THEN
    CREATE TRIGGER trg_notify_on_like AFTER INSERT ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();
  END IF;
END $$;