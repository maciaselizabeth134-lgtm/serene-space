import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { learningResources, dailyQuotes } from "@/lib/quotes";
import { BookOpen, Clock } from "lucide-react";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "学习资料 — 清心" },
      { name: "description", content: "自律理念、方法、心法,系统了解自律之道。" },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl">学习与思考</h1>
        <p className="mt-1 text-sm text-muted-foreground">理念、方法、心法 — 修心之道，慢慢走。</p>

        {/* Articles */}
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {learningResources.map((r) => (
            <article key={r.title} className="group rounded-3xl border border-border/60 bg-card p-6 shadow-soft transition-smooth hover:-translate-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">{r.category}</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" /> {r.readTime}
                </span>
              </div>
              <h2 className="mt-3 font-display text-xl group-hover:text-primary transition-smooth">{r.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.summary}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs text-primary">
                <BookOpen className="h-3.5 w-3.5" /> 阅读全文
              </div>
            </article>
          ))}
        </div>

        {/* Quotes wall */}
        <h2 className="mt-14 font-display text-2xl">箴言集</h2>
        <p className="mt-1 text-sm text-muted-foreground">古今智慧,日日温习。</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dailyQuotes.map((q, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <p className="font-display text-base leading-relaxed">"{q.text}"</p>
              <p className="mt-3 text-xs text-muted-foreground">— {q.source}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
