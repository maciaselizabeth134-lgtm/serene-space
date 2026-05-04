import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Bell, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

const KEY = "qx_reminder_dismissed_date";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function DailyReminder() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    const today = todayStr();
    if (typeof window !== "undefined" && localStorage.getItem(KEY) === today) return;
    supabase.from("checkins").select("id").eq("user_id", user.id).eq("checkin_date", today).maybeSingle()
      .then(({ data }) => { if (!data) setShow(true); });
  }, [user]);

  if (!show) return null;
  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, todayStr());
    setShow(false);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 z-30 w-[92%] max-w-sm -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-card/95 p-3 shadow-glow backdrop-blur-xl">
        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">今天还没打卡</p>
          <p className="text-[11px] text-muted-foreground">花 10 秒记录今天的状态</p>
        </div>
        <Link to="/checkin" onClick={dismiss} className="rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">去打卡</Link>
        <button onClick={dismiss} aria-label="关闭" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
