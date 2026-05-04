import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { SharePoster } from "@/components/SharePoster";
import { Share2, Lock } from "lucide-react";

export const Route = createFileRoute("/achievements")({
  head: () => ({ meta: [{ title: "成就勋章 — 清心" }] }),
  component: AchievementsPage,
});

function computeDays(start: string | null): number {
  if (!start) return 0;
  const d0 = new Date(start + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - d0.getTime()) / 86400000)) + 1;
}

function AchievementsPage() {
  const { user, loading } = useAuth();
  const [days, setDays] = useState(0);
  const [username, setUsername] = useState("我");
  const [share, setShare] = useState<{ name?: string; emoji?: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username, quit_start_date").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setUsername(data.username);
          setDays(computeDays(data.quit_start_date));
        }
      });
  }, [user]);

  if (!loading && !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-sm text-muted-foreground">登录后查看你的成就</p>
          <Link to="/auth" className="mt-4 inline-block rounded-full bg-gradient-primary px-6 py-2.5 text-sm text-primary-foreground">去登录</Link>
        </div>
      </AppShell>
    );
  }

  const unlocked = ACHIEVEMENTS.filter((a) => days >= a.threshold).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl">成就勋章</h1>
        <p className="mt-1 text-sm text-muted-foreground">每一份坚持都值得被纪念。</p>

        <div className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl">{unlocked}</span>
            <span className="text-sm text-muted-foreground">/ {ACHIEVEMENTS.length} 已解锁</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">当前坚持 {days} 天</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const got = days >= a.threshold;
            return (
              <div
                key={a.id}
                className={`relative rounded-2xl border p-4 transition-smooth ${
                  got ? "border-primary/40 bg-gradient-to-br from-primary/10 to-card" : "border-border/60 bg-card opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{got ? a.emoji : "🔒"}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{a.name}</p>
                      <span className="text-[10px] text-muted-foreground">{a.threshold} 天</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                </div>
                {got ? (
                  <button
                    onClick={() => setShare({ name: a.name, emoji: a.emoji })}
                    className="mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground transition-smooth hover:text-primary"
                  >
                    <Share2 className="h-3 w-3" /> 生成海报
                  </button>
                ) : (
                  <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3" /> 还差 {a.threshold - days} 天
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setShare({})}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft"
        >
          <Share2 className="h-4 w-4" /> 分享我的坚持
        </button>
      </div>

      <SharePoster
        open={!!share}
        onOpenChange={(v) => !v && setShare(null)}
        username={username}
        days={days}
        achievementName={share?.name}
        achievementEmoji={share?.emoji}
      />
    </AppShell>
  );
}
