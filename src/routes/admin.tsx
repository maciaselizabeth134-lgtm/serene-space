import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useIsAdmin } from "@/lib/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Megaphone, Inbox, Flag, Star, Pin, Trash2, Send } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "管理后台 — 清心" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type Tab = "announcements" | "feedback" | "reports" | "posts";

function AdminPage() {
  const { isAdmin, checking, user } = useIsAdmin();
  const [tab, setTab] = useState<Tab>("announcements");

  if (checking) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center text-sm text-muted-foreground">检查权限中…</div>
      </AppShell>
    );
  }
  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-sm text-muted-foreground">请先登录</p>
          <Link to="/auth" className="mt-4 inline-block rounded-full bg-gradient-primary px-6 py-2 text-sm text-primary-foreground">去登录</Link>
        </div>
      </AppShell>
    );
  }
  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">你没有管理员权限</p>
        </div>
      </AppShell>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Megaphone }[] = [
    { key: "announcements", label: "公告", icon: Megaphone },
    { key: "feedback", label: "反馈", icon: Inbox },
    { key: "reports", label: "举报", icon: Flag },
    { key: "posts", label: "精选", icon: Star },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl">管理后台</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">仅管理员可见 · 处理公告、反馈、举报与精选</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs transition-smooth ${
                tab === t.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "announcements" && <AnnouncementsAdmin />}
          {tab === "feedback" && <FeedbackAdmin />}
          {tab === "reports" && <ReportsAdmin />}
          {tab === "posts" && <PostsAdmin />}
        </div>
      </div>
    </AppShell>
  );
}

function AnnouncementsAdmin() {
  const { user } = useIsAdmin();
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user) return;
    if (title.trim().length < 2 || content.trim().length < 5) return toast.error("标题或内容太短");
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(), content: content.trim(), pinned, author_id: user.id, published: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("已发布");
    setTitle(""); setContent(""); setPinned(false);
    load();
  };

  const togglePin = async (id: string, v: boolean) => {
    await supabase.from("announcements").update({ pinned: !v }).eq("id", id);
    load();
  };
  const togglePub = async (id: string, v: boolean) => {
    await supabase.from("announcements").update({ published: !v }).eq("id", id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("删除这条公告?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="公告标题"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} maxLength={1500} placeholder="公告内容（支持换行）"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> 置顶
          </label>
          <button onClick={create} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-1.5 text-xs text-primary-foreground disabled:opacity-60">
            <Send className="h-3.5 w-3.5" /> 发布公告
          </button>
        </div>
      </div>
      {list.map((a) => (
        <div key={a.id} className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium">{a.pinned && "📌 "}{a.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</p>
              <p className="mt-2 text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("zh-CN")} · {a.published ? "已发布" : "草稿"}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => togglePin(a.id, a.pinned)} className="rounded-full border border-border px-2 py-1 text-[10px]"><Pin className="h-3 w-3 inline" /> {a.pinned ? "取消置顶" : "置顶"}</button>
              <button onClick={() => togglePub(a.id, a.published)} className="rounded-full border border-border px-2 py-1 text-[10px]">{a.published ? "下架" : "发布"}</button>
              <button onClick={() => remove(a.id)} className="rounded-full border border-destructive/40 text-destructive px-2 py-1 text-[10px]"><Trash2 className="h-3 w-3 inline" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedbackAdmin() {
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "replied">("pending");
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = async () => {
    let q = supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setList(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const reply = async (id: string) => {
    const text = (draft[id] ?? "").trim();
    if (text.length < 2) return toast.error("回复太短");
    const { error } = await supabase.from("feedback").update({ reply: text, status: "replied", replied_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("已回复");
    setDraft((d) => ({ ...d, [id]: "" }));
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "replied", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
            {f === "pending" ? "待处理" : f === "replied" ? "已回复" : "全部"}
          </button>
        ))}
      </div>
      {list.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">暂无反馈</p> : list.map((f) => (
        <div key={f.id} className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{f.category} · {new Date(f.created_at).toLocaleString("zh-CN")}</span>
            <span className={`rounded-full px-2 py-0.5 ${f.status === "replied" ? "bg-primary/10 text-primary" : "bg-muted"}`}>{f.status === "replied" ? "已回复" : "待处理"}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{f.content}</p>
          {f.contact && <p className="mt-1 text-xs text-muted-foreground">联系：{f.contact}</p>}
          {f.reply ? (
            <div className="mt-2 rounded-xl bg-primary/5 px-3 py-2 text-xs"><span className="font-medium text-primary">已回复：</span><span className="ml-1 whitespace-pre-wrap">{f.reply}</span></div>
          ) : (
            <div className="mt-2 flex gap-2">
              <textarea value={draft[f.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [f.id]: e.target.value }))} rows={2} placeholder="官方回复…"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs resize-none outline-none focus:border-primary" />
              <button onClick={() => reply(f.id)} className="rounded-full bg-gradient-primary px-3 text-xs text-primary-foreground">回复</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ReportsAdmin() {
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");

  const load = async () => {
    let q = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setList(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const resolve = async (id: string, status: string) => {
    await supabase.from("reports").update({ status }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "resolved", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
            {f === "pending" ? "待处理" : f === "resolved" ? "已处理" : "全部"}
          </button>
        ))}
      </div>
      {list.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">暂无举报</p> : list.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{r.target_type} · {new Date(r.created_at).toLocaleString("zh-CN")}</span>
            <span className={`rounded-full px-2 py-0.5 ${r.status === "resolved" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{r.status}</span>
          </div>
          <p className="mt-2 text-sm"><span className="font-medium">原因：</span>{r.reason}</p>
          {r.detail && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{r.detail}</p>}
          <p className="mt-1 text-[10px] text-muted-foreground">目标 ID：{r.target_id}</p>
          {r.status === "pending" && (
            <div className="mt-2 flex gap-2">
              <button onClick={() => resolve(r.id, "resolved")} className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">标记处理</button>
              <button onClick={() => resolve(r.id, "rejected")} className="rounded-full border border-border px-3 py-1 text-xs">驳回</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PostsAdmin() {
  const [list, setList] = useState<any[]>([]);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const load = async () => {
    let q = supabase.from("posts").select("id, title, content, featured, created_at, user_id").order("created_at", { ascending: false }).limit(50);
    if (onlyFeatured) q = q.eq("featured", true);
    const { data } = await q;
    setList(data ?? []);
  };
  useEffect(() => { load(); }, [onlyFeatured]);

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("posts").update({ featured: !v }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-3">
      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={onlyFeatured} onChange={(e) => setOnlyFeatured(e.target.checked)} /> 仅看精选
      </label>
      {list.map((p) => (
        <div key={p.id} className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium">{p.featured && "⭐ "}{p.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.content}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString("zh-CN")}</p>
            </div>
            <button onClick={() => toggle(p.id, p.featured)} className={`rounded-full border px-3 py-1 text-xs ${p.featured ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
              <Star className="inline h-3 w-3" /> {p.featured ? "取消精选" : "设为精选"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}