import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Heart, MessageCircle, Megaphone, UserPlus, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "消息中心 — 清心" }, { name: "description", content: "你的消息通知" }] }),
  component: NotificationsPage,
});

type Noti = {
  id: string;
  type: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  content: string | null;
  read: boolean;
  created_at: string;
  actor?: { username: string; avatar_url: string | null } | null;
};

type Tab = "all" | "interaction" | "follow" | "system";

function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState<Noti[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const items = (data ?? []) as Noti[];
    const actorIds = Array.from(new Set(items.map((n) => n.actor_id).filter(Boolean) as string[]));
    if (actorIds.length) {
      const { data: ps } = await supabase.from("profiles").select("id, username, avatar_url").in("id", actorIds);
      const m = new Map((ps ?? []).map((p) => [p.id, { username: p.username, avatar_url: p.avatar_url }] as const));
      items.forEach((n) => { if (n.actor_id) n.actor = m.get(n.actor_id) ?? null; });
    }
    setList(items);
    setLoading(false);
  };
  useEffect(() => { if (!authLoading && user) load(); /* eslint-disable-next-line */ }, [authLoading, user]);

  const markAllRead = async () => {
    if (!user) return;
    const ids = list.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setList((l) => l.map((n) => ({ ...n, read: true })));
    toast.success("已全部标为已读");
  };
  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setList((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };
  const removeOne = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setList((l) => l.filter((n) => n.id !== id));
  };

  if (!authLoading && !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">登录后查看消息</p>
          <Link to="/auth" className="mt-4 inline-block rounded-full bg-gradient-primary px-6 py-2.5 text-sm text-primary-foreground">去登录</Link>
        </div>
      </AppShell>
    );
  }

  const iconFor = (t: string) => {
    if (t === "comment") return <MessageCircle className="h-4 w-4 text-primary" />;
    if (t === "like") return <Heart className="h-4 w-4 text-primary" />;
    if (t === "follow") return <UserPlus className="h-4 w-4 text-primary" />;
    return <Megaphone className="h-4 w-4 text-primary" />;
  };
  const labelFor = (t: string) =>
    t === "comment" ? "评论了你" :
    t === "like" ? "点赞了你" :
    t === "follow" ? "关注了你" :
    t === "announcement" ? "发布了公告" : "系统消息";

  const filtered = list.filter((n) => {
    if (tab === "all") return true;
    if (tab === "interaction") return n.type === "like" || n.type === "comment";
    if (tab === "follow") return n.type === "follow";
    return n.type === "system" || n.type === "announcement";
  });
  const unreadCount = list.filter((n) => !n.read).length;

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: `全部` },
    { key: "interaction", label: "互动" },
    { key: "follow", label: "关注" },
    { key: "system", label: "系统" },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">消息中心</h1>
            <p className="mt-1 text-sm text-muted-foreground">{unreadCount > 0 ? `${unreadCount} 条未读` : "评论、点赞与系统通知"}</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              <CheckCheck className="h-3.5 w-3.5" /> 全部已读
            </button>
          )}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-smooth ${tab === t.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">加载中…</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">还没有新消息</p>
          ) : filtered.map((n) => (
            <div key={n.id} onClick={() => !n.read && markOne(n.id)}
              className={`group flex gap-3 rounded-2xl border border-border/60 bg-card p-4 cursor-pointer transition-smooth ${n.read ? "" : "ring-1 ring-primary/30 bg-primary/5"}`}>
              <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {iconFor(n.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {n.actor_id ? (
                    <Link to="/u/$userId" params={{ userId: n.actor_id }} className="font-medium hover:text-primary">{n.actor?.username ?? "有人"}</Link>
                  ) : (
                    <span className="font-medium">系统</span>
                  )}
                  <span className="text-muted-foreground"> {labelFor(n.type)}</span>
                </p>
                {n.content && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.content}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("zh-CN")}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeOne(n.id); }}
                className="shrink-0 self-start opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-smooth">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
