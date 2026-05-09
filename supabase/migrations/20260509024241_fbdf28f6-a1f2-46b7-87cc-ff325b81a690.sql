-- Allow everyone to view pets so other users' pets render in the community/ranking/profile pages.
DROP POLICY IF EXISTS "user_pets_select_own" ON public.user_pets;

CREATE POLICY "user_pets_select_public"
ON public.user_pets
FOR SELECT
USING (true);