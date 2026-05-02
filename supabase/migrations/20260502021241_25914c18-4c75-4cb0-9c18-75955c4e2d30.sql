-- Add categories array to checkins to track which discipline projects each check-in covers
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';

-- Index for efficient array membership queries
CREATE INDEX IF NOT EXISTS idx_checkins_categories ON public.checkins USING GIN (categories);

-- RPC: count check-ins per user that include a given category
CREATE OR REPLACE FUNCTION public.get_category_checkin_counts(_user_ids uuid[], _category text)
RETURNS TABLE(user_id uuid, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.user_id, COUNT(*)::bigint
  FROM public.checkins c
  WHERE c.user_id = ANY(_user_ids)
    AND _category = ANY(c.categories)
  GROUP BY c.user_id;
$$;