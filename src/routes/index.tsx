import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Sparkles, Users, Heart, CalendarCheck, BookOpen, ArrowRight } from "lucide-react";
import { getTodayQuote } from "@/lib/quotes";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-zen.jpg";
import { AnnouncementBoard } from "@/components/AnnouncementBoard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "清心 — 自律社区 · 重获自由" },
      { name: "description", content: "温暖治愈的自律社区。每日打卡、心得交流、匿名树洞,与同行者一起重获自由。" },
      { property: "og:title", content: "清心 — 自律社区" },
      { property: "og:description", content: "打卡 · 树洞 · 心得分享 — 与同行者一起重获自由与宁静。" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const quote = getTodayQuote();
  const { user, loading: authLoading } = useAuth();
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setDays(null); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("quit_start_date")
        .eq("id", user.id)
        .single();
      const start = data?.quit_start_date;
      if (!start) { setDays(1); return; }
      const d0 = new Date(start + "T00:00:00");
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const total = Math.max(0, Math.round((today.getTime() - d0.getTime()) / 86400000)) + 1;
      setDays(total);
    })();
  }, [user, authLoading]);

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero opacity-60" aria-hidden />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-10 px-4 py-16 md:py-24 text-center">
          <div className="animate-fade-up space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-card/70 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              一段重新认识自己的旅程
            </div>
            <h1 className="font-display text-4xl leading-tight md:text-6xl">
              静水流深<br />
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                清心见性
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-base text-muted-foreground md:text-lg leading-relaxed">
              这里没有指责,只有同行。打卡每一天的坚持,分享每一份心得,
              在匿名树洞里安放脆弱,与无数同行者一起,一步一步,走向更清明的自己。
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/checkin" className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-3 text-sm font-medium text-primary-foreground shadow-soft transition-smooth hover:shadow-glow">
                开始今日打卡
                <ArrowRight className="h-4 w-4 transition-smooth group-hover:translate-x-1" />
              </Link>
              <Link to="/community" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-7 py-3 text-sm transition-smooth hover:bg-card backdrop-blur">
                走进社区
              </Link>
            </div>
          </div>

          {/* Circular Hero with day counter */}
          <div className="relative animate-float mt-2">
            {/* Soft outer glow rings */}
            <div className="pointer-events-none absolute -inset-8 rounded-full bg-gradient-primary opacity-20 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -inset-2 rounded-full border border-primary/20" aria-hidden />

            <div className="relative h-[300px] w-[300px] sm:h-[360px] sm:w-[360px] md:h-[420px] md:w-[420px] overflow-hidden rounded-full shadow-soft ring-1 ring-border/60">
              <img
                src={heroImg}
                alt="水墨竹叶与莲花,寓意清净修身"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Translucent overlay for legibility */}
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/55 to-background/80 backdrop-blur-[2px]" aria-hidden />

              {/* Inner content */}
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center">
                {authLoading ? (
                  <div className="h-16 w-32 animate-pulse rounded-2xl bg-card/50" />
                ) : user ? (
                  <>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">自律天数</p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-display text-7xl md:text-8xl leading-none bg-gradient-to-b from-primary to-primary-glow bg-clip-text text-transparent">
                        {days ?? "—"}
                      </span>
                      <span className="font-display text-2xl text-foreground/70">天</span>
                    </div>
                    <Link
                      to="/checkin"
                      className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-card/80 px-4 py-1.5 text-xs text-foreground/80 backdrop-blur transition-smooth hover:bg-card"
                    >
                      去打卡 <ArrowRight className="h-3 w-3" />
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">CLEAR HEART</p>
                    <p className="mt-4 font-display text-2xl md:text-3xl leading-snug">
                      开启你的<br />清心之旅
                    </p>
                    <Link
                      to="/auth"
                      className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-5 py-2 text-xs font-medium text-primary-foreground shadow-soft transition-smooth hover:shadow-glow"
                    >
                      登录 / 注册 <ArrowRight className="h-3 w-3" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <AnnouncementBoard />

      {/* Daily Quote */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-soft md:p-12">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">今日箴言</p>
          <p className="mt-4 font-display text-2xl leading-relaxed md:text-3xl">"{quote.text}"</p>
          <p className="mt-4 text-sm text-muted-foreground">— {quote.source}</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/checkin", icon: CalendarCheck, title: "每日打卡", desc: "记录自律天数,见证每一次坚持。" },
            { to: "/community", icon: Users, title: "心得社区", desc: "分享经验,互相鼓励,共同成长。" },
            { to: "/confessions", icon: Heart, title: "匿名树洞", desc: "卸下伪装,在这里诉说真实的自己。" },
            { to: "/learn", icon: BookOpen, title: "学习资料", desc: "理念、方法、心法,系统了解自律之道。" },
          ].map((f) => (
            <Link
              key={f.to}
              to={f.to}
              className="group rounded-3xl border border-border/60 bg-card p-6 transition-smooth hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-smooth group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
