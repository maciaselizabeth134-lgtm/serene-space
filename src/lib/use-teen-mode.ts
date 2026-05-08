import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type TeenModeState = {
  enabled: boolean;
  pinSet: boolean;
  usageMinutes: number;
  usageDate: string | null;
};

const DAILY_LIMIT_MIN = 40;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useTeenMode() {
  const { user } = useAuth();
  const [state, setState] = useState<TeenModeState>({ enabled: false, pinSet: false, usageMinutes: 0, usageDate: null });
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setState({ enabled: false, pinSet: false, usageMinutes: 0, usageDate: null }); setLoaded(true); return; }
    const { data } = await supabase
      .from("profiles")
      .select("teen_mode_enabled, teen_mode_pin, teen_mode_usage_minutes, teen_mode_usage_date")
      .eq("id", user.id)
      .single();
    if (data) {
      // Reset usage on new day
      const today = todayStr();
      let mins = data.teen_mode_usage_minutes ?? 0;
      if (data.teen_mode_usage_date !== today) {
        mins = 0;
        await supabase.from("profiles")
          .update({ teen_mode_usage_minutes: 0, teen_mode_usage_date: today })
          .eq("id", user.id);
      }
      setState({
        enabled: !!data.teen_mode_enabled,
        pinSet: !!data.teen_mode_pin,
        usageMinutes: mins,
        usageDate: data.teen_mode_usage_date ?? today,
      });
    }
    setLoaded(true);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Tick usage minutes when enabled
  useEffect(() => {
    if (!state.enabled || !user) return;
    const id = setInterval(async () => {
      const today = todayStr();
      const next = state.usageMinutes + 1;
      setState((s) => ({ ...s, usageMinutes: next, usageDate: today }));
      await supabase.from("profiles")
        .update({ teen_mode_usage_minutes: next, teen_mode_usage_date: today })
        .eq("id", user.id);
    }, 60_000);
    return () => clearInterval(id);
  }, [state.enabled, state.usageMinutes, user]);

  // Outcome flags
  const hour = new Date().getHours();
  const inCurfew = hour >= 22 || hour < 6;
  const overLimit = state.usageMinutes >= DAILY_LIMIT_MIN;
  const blockedByTime = state.enabled && (inCurfew || overLimit);

  const isRouteRestricted = (path: string) => {
    if (!state.enabled) return false;
    return /^\/(community|confessions|search)/.test(path);
  };

  return { ...state, loaded, refresh, blockedByTime, inCurfew, overLimit, dailyLimit: DAILY_LIMIT_MIN, isRouteRestricted };
}