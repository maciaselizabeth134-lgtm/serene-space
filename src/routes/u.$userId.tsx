import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { AvatarWithPet } from "@/components/AvatarWithPet";
import { PET_CATALOG, stageFromDays, type PetSpecies, STAGE_LABELS } from "@/components/PetCreature";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ShieldOff, ShieldCheck, Share2 } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { SharePoster } from "@/components/SharePoster";

export const Route = createFileRoute("/u/$userId")({
  head: () => ({ meta: [{ title: "用户主页 — 清心" }] }),
  component: PublicProfilePage,
});

function computeDays(start: string | null): number {
  if (!start) return 1;
  const d0 = new Date(start + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - d0.getTime()) / 86400000)) + 1;
}

type Profile = { id: string; username: string; avatar_url: string | null; bio: string | null; quit_start_date: string | null };
type Pet = { pet_type: PetSpecies; nickname: string };
type Post = { id: string; title: string; content: string; created_at: string; category: string };

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      setProfile(p as Profile | null);
      const { data: pt } = await supabase.from("user_pets").select("pet_type, nickname").eq("user_id", userId).maybeSingle();
      const valid = new Set(PET_CATALOG.map((x) => x.id));
      if (pt && valid.has(pt.pet_type as PetSpecies)) setPet({ pet_type: pt.pet_type as PetSpecies, nickname: pt.nickname });
      const { data: ps } = await supabase.from("posts").select("id, title, content, created_at, category").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
      setPosts((ps ?? []) as Post[]);
      const [{ count: fc }, { count: gc }] = await Promise.all([
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", userId),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
      ]);
      setFollowers(fc ?? 0);
      setFollowing(gc ?? 0);
      if (user) {
        const { data: b } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id).eq("blocked_id", userId).maybeSingle();
        setBlocked(!!b);
      }
    })();
  }, [userId, user]);

  const days = computeDays(profile?.quit_start_date ?? null);
  const stage = stageFromDays(days);

  const toggleBlock = async () => {
    if (!user) return toast.error("请先登录");
    if (user.id === userId) return;
    if (blocked) {
      await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", userId);
      setBlocked(false);
      toast.success("已取消屏蔽");
    } else {
      if (!window.confirm("屏蔽后将不再看到 TA 的内容")) return;
      await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: userId });
      setBlocked(true);
      toast.success("已屏蔽");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        {!profile ? (
          <p className="py-12 text-center text-sm text-muted-foreground">用户不存在</p>
        ) : (
          <>
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
              <div className="flex items-center gap-4">
                <AvatarWithPet
                  userId={profile.id}
                  avatarUrl={profile.avatar_url}
                  username={profile.username}
                  petSpecies={pet?.pet_type ?? null}
                  petStage={stage}
                  size={80}
                />
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-xl truncate">{profile.username}</h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lv.{stage + 1} · {STAGE_LABELS[stage]} · 坚持 {days} 天
                  </p>
                  {pet && <p className="mt-1 text-xs text-muted-foreground">🐾 {pet.nickname}</p>}
                </div>
                <FollowButton userId={profile.id} />
              </div>
              {profile.bio && <p className="mt-4 whitespace-pre-wrap text-sm text-foreground/90">{profile.bio}</p>}
              <div className="mt-4 flex items-center gap-4 text-xs">
                <Link to="/u/$userId/follows" params={{ userId: profile.id }} search={{ tab: "following" }} className="hover:text-primary">
                  <span className="font-display text-base">{following}</span>
                  <span className="ml-1 text-muted-foreground">关注</span>
                </Link>
                <Link to="/u/$userId/follows" params={{ userId: profile.id }} search={{ tab: "followers" }} className="hover:text-primary">
                  <span className="font-display text-base">{followers}</span>
                  <span className="ml-1 text-muted-foreground">粉丝</span>
                </Link>
                <button onClick={() => setShareOpen(true)} className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                  <Share2 className="h-3.5 w-3.5" /> 分享
                </button>
              </div>
              {user && user.id !== profile.id && (
                <button
                  onClick={toggleBlock}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs text-muted-foreground transition-smooth hover:text-destructive"
                >
                  {blocked ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                  {blocked ? "已屏蔽 · 点击取消" : "屏蔽该用户"}
                </button>
              )}
            </div>

            <h2 className="mt-8 font-display text-lg">TA 的发布</h2>
            <div className="mt-3 space-y-3">
              {posts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">还没有发布过内容</p>
              ) : posts.map((p) => (
                <Link key={p.id} to="/community" className="block rounded-2xl border border-border/60 bg-card p-4 transition-smooth hover:bg-muted/30">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{p.content}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("zh-CN")}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
      {profile && (
        <SharePoster open={shareOpen} onOpenChange={setShareOpen} username={profile.username} days={days} />
      )}
    </AppShell>
  );
}