import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Send, Trash2 } from "lucide-react";
import { moderateText } from "@/lib/moderation";

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string | null;
  avatar_url?: string | null;
};

export function PostComments({ postId, onCountChange }: { postId: string; onCountChange?: (delta: number) => void }) {
  const { user } = useAuth();
  const [list, setList] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const items = (data ?? []) as Comment[];
    const ids = Array.from(new Set(items.map((c) => c.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
      const m = new Map((ps ?? []).map((p) => [p.id, p] as const));
      items.forEach((c) => { const p = m.get(c.user_id); c.username = p?.username; c.avatar_url = p?.avatar_url; });
    }
    setList(items);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [postId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("请先登录");
    const v = text.trim();
    if (v.length < 1) return;
    setBusy(true);
    const mod = await moderateText(v);
    if (!mod.ok) { setBusy(false); return toast.error("内容不符合社区规范"); }
    const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content: v });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText("");
    onCountChange?.(1);
    load();
  };

  const remove = async (id: string) => {
    if (!user) return;
    if (!confirm("删除这条评论?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    onCountChange?.(-1);
    setList((l) => l.filter((c) => c.id !== id));
  };

  return (
    <div className="mt-4 border-t border-border/40 pt-4">
      {loading ? (
        <p className="py-2 text-center text-xs text-muted-foreground">加载评论…</p>
      ) : list.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">还没有评论，来抢第一条沙发吧 🛋️</p>
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <Link to="/u/$userId" params={{ userId: c.user_id }} className="shrink-0">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">
                    {(c.username ?? "?").slice(0, 1)}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1 rounded-2xl bg-muted/50 px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <Link to="/u/$userId" params={{ userId: c.user_id }} className="font-medium text-foreground hover:text-primary truncate">
                    {c.username ?? "匿名"}
                  </Link>
                  <span>{new Date(c.created_at).toLocaleDateString("zh-CN")}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
              </div>
              {user?.id === c.user_id && (
                <button onClick={() => remove(c.id)} className="shrink-0 self-start text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {user && (
        <form onSubmit={submit} className="mt-3 flex items-center gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="写评论…"
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary" />
          <button type="submit" disabled={busy || !text.trim()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground disabled:opacity-50">
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}