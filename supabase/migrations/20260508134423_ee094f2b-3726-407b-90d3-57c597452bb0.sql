ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teen_mode_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS teen_mode_pin text,
  ADD COLUMN IF NOT EXISTS teen_mode_usage_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS teen_mode_usage_date date;