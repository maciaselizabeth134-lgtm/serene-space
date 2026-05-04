import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "搜索 — 清心" }] }),
  component: SearchPage,
});

type Post = { id: string; title: string; content: string; user_id: string; created_at: string };
type User = { id: string; username: string; avatar_url: string | null; bio: string | null };

function SearchPage() {
  const [q, setQ] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const v = q.trim();
    if (v.length < 2) { setPosts([]); setUsers([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const [{ data: ps }, { data: us }] = await Promise.all([
        supabase.from("posts").select("id, title, content, user_id, created_at")
          .or(`title.ilike.%${v}%,content.ilike.%${v}%`)
          .order("created_at", { ascending: false }).limit(30),
        supabase.from("profiles").select("id, username, avatar_url, bio")
          .or(`username.ilike.%${v}%,bio.ilike.%${v}%`).limit(20),
      ]);
      setPosts((ps ?? []) as Post[]);
      setUsers((us ?? []) as User[]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl">搜索</h1>
        <div className="relative mt-4">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索帖子或用户(至少2个字)"
            className="w-full rounded-full border border-border bg-card pl-11 pr-4 py-3 text-sm outline-none focus:border-primary"
          />
        </div>

        {q.trim().length < 2 ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">输入关键词开始搜索</p>
        ) : loading ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">搜索中…</p>
        ) : (
          <>
            {users.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-base">用户 · {users.length}</h2>
                <div className="mt-3 grid gap-2">
                  {users.map((u) => (
                    <Link key={u.id} to="/u/$userId" params={{ userId: u.id }} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition-smooth hover:bg-muted/30">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                        {u.avatar_url && <img src={u.avatar_url} alt={u.username} className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.username}</p>
                        {u.bio && <p className="text-xs text-muted-foreground line-clamp-1">{u.bio}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {posts.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-base">帖子 · {posts.length}</h2>
                <div className="mt-3 grid gap-2">
                  {posts.map((p) => (
                    <Link key={p.id} to="/community" className="block rounded-2xl border border-border/60 bg-card p-4 transition-smooth hover:bg-muted/30">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{p.content}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {posts.length === 0 && users.length === 0 && (
              <p className="mt-12 text-center text-sm text-muted-foreground">没有找到相关内容</p>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
