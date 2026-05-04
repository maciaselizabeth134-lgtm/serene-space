import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Flame } from "lucide-react";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "数据统计 — 清心" }] }),
  component: StatsPage,
});

const CATS: Record<string, { label: string; emoji: string }> = {
  quit_smoke: { label: "戒烟", emoji: "🚭" },
  quit_alcohol: { label: "戒酒", emoji: "🍺" },
  quit_milktea: { label: "戒奶茶", emoji: "🧋" },
  exercise: { label: "锻炼", emoji: "🏃" },
  quit_lust: { label: "戒淫", emoji: "🧘" },
  quit_latenight: { label: "戒熬夜", emoji: "🌙" },
};

type CK = { checkin_date: string; categories: string[] };

function StatsPage() {
  const { user, loading } = useAuth();
  const [list, setList] = useState<CK[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("checkins").select("checkin_date, categories").eq("user_id", user.id)
      .order("checkin_date", { ascending: false }).limit(365)
      .then(({ data }) => setList((data ?? []) as CK[]));
  }, [user]);

  const stats = useMemo(() => {
    const set = new Set(list.map((c) => c.checkin_date));
    // current streak
    let streak = 0;
    const d = new Date();
    while (true) {
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (set.has(k)) { streak++; d.setDate(d.getDate()-1); } else break;
    }
    // last 30 days
    const today = new Date();
    let last30 = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(today.getDate()-i);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (set.has(k)) last30++;
    }
    // by category
    const cats: Record<string, number> = {};
    list.forEach((c) => (c.categories ?? []).forEach((cat) => { cats[cat] = (cats[cat] ?? 0) + 1; }));
    return { total: list.length, streak, last30, cats };
  }, [list]);

  if (!loading && !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-sm text-muted-foreground">登录后查看你的数据</p>
          <Link to="/auth" className="mt-4 inline-block rounded-full bg-gradient-primary px-6 py-2.5 text-sm text-primary-foreground">去登录</Link>
        </div>
      </AppShell>
    );
  }

  // simple last-12-weeks heatmap
  const today = new Date();
  const days: { date: string; checked: boolean }[] = [];
  for (let i = 12*7-1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    days.push({ date: k, checked: list.some((c) => c.checkin_date === k) });
  }
  const weeks: { date: string; checked: boolean }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i+7));

  const maxCat = Math.max(1, ...Object.values(stats.cats));

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl">数据统计</h1>
        <p className="mt-1 text-sm text-muted-foreground">看看你走过的路。</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Card label="累计打卡" value={stats.total} unit="次" />
          <Card label="连续天数" value={stats.streak} unit="天" icon={<Flame className="h-4 w-4" />} highlight />
          <Card label="近30天" value={stats.last30} unit="天" />
        </div>

        <div className="mt-8 rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg">12周打卡热力</h2>
          </div>
          <div className="mt-4 flex gap-1 overflow-x-auto">
            {weeks.map((w, i) => (
              <div key={i} className="flex flex-col gap-1">
                {w.map((d) => (
                  <div
                    key={d.date}
                    title={d.date}
                    className={`h-3.5 w-3.5 rounded-sm ${d.checked ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg">分类统计</h2>
          {Object.keys(stats.cats).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">暂无数据</p>
          ) : (
            <div className="mt-4 space-y-3">
              {Object.entries(stats.cats).sort((a,b)=>b[1]-a[1]).map(([k,v]) => {
                const meta = CATS[k] ?? { label: k, emoji: "🌱" };
                const w = (v / maxCat) * 100;
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between text-xs">
                      <span>{meta.emoji} {meta.label}</span>
                      <span className="text-muted-foreground">{v} 次</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Card({ label, value, unit, icon, highlight }: { label: string; value: number; unit: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border/60 p-4 shadow-soft ${highlight ? "bg-gradient-primary text-primary-foreground" : "bg-card"}`}>
      <div className="flex items-center gap-1.5 text-[11px] opacity-80">{icon}{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-2xl">{value}</span>
        <span className="text-xs opacity-70">{unit}</span>
      </div>
    </div>
  );
}
