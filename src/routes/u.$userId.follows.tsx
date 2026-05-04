import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/FollowButton";

const search = z.object({ tab: z.enum(["followers","following"]).default("following") });

export const Route = createFileRoute("/u/$userId/follows")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "关注 — 清心" }] }),
  component: FollowsPage,
});

type Profile = { id: string; username: string; avatar_url: string | null; bio: string | null };

function FollowsPage() {
  const { userId } = Route.useParams();
  const { tab } = useSearch({ from: "/u/$userId/follows" });
  const [list, setList] = useState<Profile[]>([]);

  useEffect(() => {
    (async () => {
      const col = tab === "followers" ? "following_id" : "follower_id";
      const other = tab === "followers" ? "follower_id" : "following_id";
      const { data: rows } = await supabase.from("follows").select(other).eq(col, userId);
      const ids = (rows ?? []).map((r: Record<string, string>) => r[other]).filter(Boolean);
      if (!ids.length) { setList([]); return; }
      const { data: ps } = await supabase.from("profiles").select("id, username, avatar_url, bio").in("id", ids);
      setList((ps ?? []) as Profile[]);
    })();
  }, [userId, tab]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex gap-2">
          <Link to="/u/$userId/follows" params={{ userId }} search={{ tab: "following" }}
            className={`rounded-full px-4 py-1.5 text-sm transition-smooth ${tab==="following"?"bg-primary/10 text-primary font-medium":"text-muted-foreground"}`}>关注</Link>
          <Link to="/u/$userId/follows" params={{ userId }} search={{ tab: "followers" }}
            className={`rounded-full px-4 py-1.5 text-sm transition-smooth ${tab==="followers"?"bg-primary/10 text-primary font-medium":"text-muted-foreground"}`}>粉丝</Link>
        </div>
        <div className="mt-6 grid gap-2">
          {list.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">暂无</p>
          ) : list.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3">
              <Link to="/u/$userId" params={{ userId: u.id }} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                  {u.avatar_url && <img src={u.avatar_url} alt={u.username} className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.username}</p>
                  {u.bio && <p className="text-xs text-muted-foreground line-clamp-1">{u.bio}</p>}
                </div>
              </Link>
              <FollowButton userId={u.id} />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
