import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkin")({
  head: () => ({
    meta: [
      { title: "每日打卡 — 清心" },
      { name: "description", content: "记录你的自律天数,每一次坚持都值得被见证。" },
    ],
  }),
  component: CheckinPage,
});

type Checkin = { id: string; checkin_date: string; mood: string; note: string | null; categories: string[] };

const DISCIPLINE_PROJECTS: { value: string; label: string; emoji: string }[] = [
  { value: "quit_smoke", label: "戒烟", emoji: "🚭" },
  { value: "quit_alcohol", label: "戒酒", emoji: "🍺" },
  { value: "quit_milktea", label: "戒奶茶", emoji: "🧋" },
  { value: "exercise", label: "锻炼", emoji: "🏃" },
  { value: "quit_lust", label: "戒淫", emoji: "🧘" },
  { value: "quit_latenight", label: "戒熬夜", emoji: "🌙" },
];

const moods = [
  { v: "great", l: "💪 状态极佳" },
  { v: "good", l: "🌿 平稳" },
  { v: "okay", l: "😐 一般" },
  { v: "tough", l: "🌧 有点难" },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string) {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function CheckinPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<{ quit_start_date: string | null } | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<Checkin | null>(null);
  const [mood, setMood] = useState("good");
  const [note, setNote] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const today = todayStr();

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: ck }] = await Promise.all([
      supabase.from("profiles").select("quit_start_date").eq("id", user.id).single(),
      supabase.from("checkins").select("*").eq("user_id", user.id).order("checkin_date", { ascending: false }).limit(60),
    ]);
    setProfile(prof);
    setCheckins((ck ?? []) as Checkin[]);
    const t = (ck ?? []).find((c) => c.checkin_date === today) as Checkin | undefined;
    setTodayCheckin(t ?? null);
    if (t) {
      setSelectedCats(t.categories ?? []);
      if (t.mood) setMood(t.mood);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  if (!authLoading && !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-2xl">请先登录</h1>
          <p className="mt-2 text-sm text-muted-foreground">登录后即可开始你的打卡之旅。</p>
          <Link to="/auth" className="mt-6 inline-block rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-soft">去登录</Link>
        </div>
      </AppShell>
    );
  }

  const checkin = async () => {
    if (!user) return;
    const { error } = await supabase.from("checkins").upsert(
      { user_id: user.id, checkin_date: today, mood, note: note || null, categories: selectedCats },
      { onConflict: "user_id,checkin_date" }
    );
    if (error) return toast.error(error.message);
    toast.success("打卡成功");
    setNote("");
    load();
  };

  const toggleCat = (v: string) => {
    setSelectedCats((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const reset = async () => {
    if (!user) return;
    if (!confirm("重新开始计时,会将自律起始日期设为今天。确认吗?")) return;
    const { error } = await supabase.from("profiles").update({ quit_start_date: today }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("已重置,新的开始,加油。");
    load();
  };

  const startDate = profile?.quit_start_date ?? today;
  const totalDays = Math.max(0, daysBetween(startDate, today)) + 1;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl">今日打卡</h1>
        <p className="mt-1 text-sm text-muted-foreground">每一次的坚持,都是给未来的礼物。</p>

        {/* Stats */}
        <div className="mt-6">
          <StatCard icon={<CalendarIcon className="h-5 w-5" />} label="自律天数" value={loading ? "—" : `${totalDays}`} suffix="天" highlight />
        </div>

        {/* Calendar (right under streak, no card frame) */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">打卡日历</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary/40" /> 已打卡
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-primary/60" /> 起始日
              </span>
            </div>
          </div>
          <div className="mt-3 -mx-4">
            <CheckinCalendar checkins={checkins} startDate={profile?.quit_start_date ?? null} />
          </div>
        </div>

        {/* Today */}
        <div className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">{today}</h2>
            {todayCheckin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" /> 今日已打卡
              </span>
            )}
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium text-muted-foreground">今天的状态</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {moods.map((m) => (
                <button
                  key={m.v}
                  onClick={() => setMood(m.v)}
                  className={`rounded-full border px-4 py-1.5 text-xs transition-smooth ${
                    mood === m.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >{m.l}</button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium text-muted-foreground">
              今天打卡哪些自律项目？<span className="ml-1 text-muted-foreground/70">(可多选,不选则记为通用打卡)</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DISCIPLINE_PROJECTS.map((p) => {
                const active = selectedCats.includes(p.value);
                return (
                  <button
                    key={p.value}
                    onClick={() => toggleCat(p.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-smooth ${
                      active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    <span className="mr-1">{p.emoji}</span>{p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="记录今天的感受、收获或挑战(可选)"
            className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary resize-none"
          />

          <div className="mt-4 flex items-center justify-between">
            <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-smooth hover:text-destructive">
              <RefreshCw className="h-3.5 w-3.5" /> 重新开始
            </button>
            <button
              onClick={checkin}
              className="rounded-full bg-gradient-primary px-7 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-smooth hover:shadow-glow"
            >
              {todayCheckin ? "更新今日记录" : "完成打卡"}
            </button>
          </div>
        </div>

        {/* History */}
        <div className="mt-10">
          <h2 className="font-display text-xl">最近打卡</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {checkins.length === 0 ? (
              <p className="col-span-2 text-center text-sm text-muted-foreground py-8">还没有记录,从今天开始吧。</p>
            ) : (
              checkins.slice(0, 10).map((c) => {
                const m = moods.find((x) => x.v === c.mood);
                return (
                  <div key={c.id} className="rounded-2xl border border-border/60 bg-card p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.checkin_date}</span>
                      <span className="text-xs text-muted-foreground">{m?.l ?? c.mood}</span>
                    </div>
                    {c.categories && c.categories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.categories.map((cat) => {
                          const p = DISCIPLINE_PROJECTS.find((x) => x.value === cat);
                          if (!p) return null;
                          return (
                            <span key={cat} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                              {p.emoji}{p.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {c.note && <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{c.note}</p>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function CheckinCalendar({ checkins, startDate }: { checkins: Checkin[]; startDate: string | null }) {
  const checkedDates = checkins.map((c) => new Date(c.checkin_date + "T00:00:00"));
  const startedDate = startDate ? new Date(startDate + "T00:00:00") : undefined;
  return (
    <Calendar
      mode="single"
      selected={undefined}
      modifiers={{
        checked: checkedDates,
        started: startedDate ? [startedDate] : [],
      }}
      modifiersClassNames={{
        checked: "bg-gradient-primary text-primary-foreground font-semibold rounded-full shadow-glow",
        started: "ring-2 ring-primary/70 rounded-full",
      }}
      className={cn("p-0 pointer-events-auto w-full [--cell-size:2.1rem]")}
      classNames={{
        root: "w-full",
        months: "flex flex-col gap-4 w-full",
        month: "flex w-full flex-col gap-4",
        table: "w-full border-collapse",
        weekdays: "flex w-full",
        weekday: "text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal",
        week: "mt-2 flex w-full",
        day: "group/day relative aspect-square flex-1 select-none p-0 text-center",
      }}
    />
  );
}

function StatCard({ icon, label, value, suffix, highlight }: { icon: React.ReactNode; label: string; value: string; suffix: string; highlight?: boolean }) {
  return (
    <div className={`rounded-3xl border border-border/60 p-5 shadow-soft transition-smooth ${highlight ? "bg-gradient-primary text-primary-foreground" : "bg-card"}`}>
      <div className="flex items-center gap-2 text-xs opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-4xl">{value}</span>
        <span className="text-sm opacity-70">{suffix}</span>
      </div>
    </div>
  );
}
