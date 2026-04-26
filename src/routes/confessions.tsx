import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, Cloud } from "lucide-react";

export const Route = createFileRoute("/confessions")({
  head: () => ({
    meta: [
      { title: "匿名树洞 — 清心" },
      { name: "description", content: "在这里安放脆弱与真实的自己,完全匿名。" },
    ],
  }),
  component: ConfessionsPage,
});

type Confession = {
  id: string;
  content: string;
  mood: string;
  created_at: string;
};

const moods = [
  { value: "calm", label: "🌿 平静", color: "oklch(0.9 0.05 155)" },
  { value: "struggling", label: "🌧 挣扎", color: "oklch(0.85 0.04 240)" },
  { value: "regret", label: "🍂 懊悔", color: "oklch(0.85 0.06 50)" },
  { value: "hopeful", label: "🌅 希望", color: "oklch(0.9 0.07 80)" },
  { value: "grateful", label: "🌸 感恩", color: "oklch(0.9 0.06 350)" },
];

function moodInfo(v: string) {
  return moods.find((m) => m.value === v) ?? moods[0];
}

function ConfessionsPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("calm");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("confessions")
      .select("id, content, mood, created_at")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) toast.error(error.message);
    setList((data ?? []) as Confession[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("请先登录");
    if (content.trim().length < 3) return toast.error("内容太短");
    setSubmitting(true);
    const { error } = await supabase.from("confessions").insert({
      user_id: user.id,
      content: content.trim(),
      mood,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("已投入树洞,愿你心安");
    setContent("");
    load();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Cloud className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mt-4 font-display text-3xl">匿名树洞</h1>
          <p className="mt-2 text-sm text-muted-foreground">这里完全匿名,卸下伪装,与自己对话。</p>
        </div>

        {/* Form */}
        {user ? (
          <form onSubmit={submit} className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="flex flex-wrap gap-2">
              {moods.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`rounded-full border px-3 py-1 text-xs transition-smooth ${
                    mood === m.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="把心事说出来,这里没有评判..."
              className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary resize-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{content.length}/500</span>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-gradient-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-smooth hover:shadow-glow disabled:opacity-60"
              >
                {submitting ? "投递中..." : "投入树洞"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 rounded-3xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
            <Link to="/auth" className="text-primary underline-offset-2 hover:underline">登录</Link> 后即可匿名投递
          </div>
        )}

        {/* Wall */}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {loading ? (
            <p className="col-span-2 text-center text-sm text-muted-foreground">加载中...</p>
          ) : list.length === 0 ? (
            <p className="col-span-2 text-center text-sm text-muted-foreground">树洞还很安静,等待第一片落叶。</p>
          ) : (
            list.map((c) => {
              const m = moodInfo(c.mood);
              return (
                <div
                  key={c.id}
                  className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition-smooth hover:-translate-y-0.5"
                  style={{ background: `linear-gradient(135deg, ${m.color} 0%, var(--card) 80%)` }}
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{m.label}</span>
                    <span>{new Date(c.created_at).toLocaleDateString("zh-CN")}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{c.content}</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="h-3.5 w-3.5" /> 愿你被温柔以待
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
