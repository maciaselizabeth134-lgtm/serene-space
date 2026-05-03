import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Heart, MessageCircle, Megaphone } from "lucide-react";
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

function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState<Noti[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
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
      // mark all read
      const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length) {
        await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
      }
    })();
  }, [authLoading, user]);

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
    return <Megaphone className="h-4 w-4 text-primary" />;
  };
  const labelFor = (t: string) => (t === "comment" ? "评论了你" : t === "like" ? "点赞了你" : "系统消息");

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl">消息中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">评论、点赞与系统通知。</p>

        <div className="mt-6 space-y-2">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">加载中…</p>
          ) : list.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">还没有新消息</p>
          ) : list.map((n) => (
            <div key={n.id} className={`flex gap-3 rounded-2xl border border-border/60 bg-card p-4 ${n.read ? "" : "ring-1 ring-primary/30"}`}>
              <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {iconFor(n.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{n.actor?.username ?? "有人"}</span>
                  <span className="text-muted-foreground"> {labelFor(n.type)}</span>
                </p>
                {n.content && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.content}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("zh-CN")}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}