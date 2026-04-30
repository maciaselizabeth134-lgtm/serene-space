import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Users, Heart, CalendarCheck, BookOpen, ArrowRight } from "lucide-react";
import { getTodayQuote } from "@/lib/quotes";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AvatarPickerDialog } from "@/components/AvatarPickerDialog";

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
  const [pickerOpen, setPickerOpen] = useState(false);

  // First-time avatar prompt: open picker if logged-in user has no avatar yet.
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (!data?.avatar_url) setPickerOpen(true);
    })();
  }, [user, authLoading]);

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero opacity-60" aria-hidden />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-8 px-4 py-24 md:py-32 text-center">
          <p className="animate-fade-up font-display text-2xl leading-relaxed md:text-4xl text-foreground/90">
            这里没有指责,<br className="md:hidden" />只有同行。
          </p>
          {!authLoading && (
            user ? (
              <button
                onClick={() => setPickerOpen(true)}
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-3 text-sm font-medium text-primary-foreground shadow-soft transition-smooth hover:shadow-glow"
              >
                选择 / 更换头像
                <ArrowRight className="h-4 w-4 transition-smooth group-hover:translate-x-1" />
              </button>
            ) : (
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-3 text-sm font-medium text-primary-foreground shadow-soft transition-smooth hover:shadow-glow"
              >
                进入清心
                <ArrowRight className="h-4 w-4 transition-smooth group-hover:translate-x-1" />
              </Link>
            )
          )}
        </div>
      </section>

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

      <AvatarPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} />
    </AppShell>
  );
}
