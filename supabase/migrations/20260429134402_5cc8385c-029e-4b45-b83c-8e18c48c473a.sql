CREATE OR REPLACE FUNCTION public.get_checkin_counts(_user_ids uuid[])
RETURNS TABLE (user_id uuid, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.user_id, COUNT(*)::bigint
  FROM public.checkins c
  WHERE c.user_id = ANY(_user_ids)
  GROUP BY c.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_checkin_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_checkin_counts(uuid[]) TO authenticated;