
CREATE TABLE public.user_pets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  pet_type TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '小清',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_pets_select_own" ON public.user_pets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_pets_insert_own" ON public.user_pets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_pets_update_own" ON public.user_pets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_pets_delete_own" ON public.user_pets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER user_pets_set_updated_at
  BEFORE UPDATE ON public.user_pets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
