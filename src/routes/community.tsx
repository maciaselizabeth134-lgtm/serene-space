import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, Heart, Plus, Sparkles, Trash2, Trophy, MoreHorizontal, Flag, ShieldOff, Star, Image as ImageIcon, X } from "lucide-react";
import { PET_CATALOG, STAGE_LABELS, stageFromDays, type PetSpecies, type PetStage } from "@/components/PetCreature";
import { AvatarWithPet } from "@/components/AvatarWithPet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportDialog } from "@/components/ReportDialog";
import { moderateText } from "@/lib/moderation";
import { PostComments } from "@/components/PostComments";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "心得社区 — 清心" },
      { name: "description", content: "分享心得,互相鼓励,共同成长。" },
    ],
  }),
  component: CommunityPage,
});

type Post = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  image_url?: string | null;
  featured?: boolean;
  profiles?: { username: string; avatar_url: string | null } | null;
  author_days?: number;
  author_stage?: PetStage;
  author_pet?: { pet_type: PetSpecies; nickname: string } | null;
  likes_count?: number;
  comments_count?: number;
  liked?: boolean;
};

const categories = [
  { value: "experience", label: "心得" },
  { value: "question", label: "求助" },
  { value: "milestone", label: "里程碑" },
  { value: "encourage", label: "鼓励" },
  { value: "quit_smoke", label: "戒烟" },
  { value: "quit_alcohol", label: "戒酒" },
  { value: "quit_milktea", label: "戒奶茶" },
  { value: "exercise", label: "锻炼" },
  { value: "quit_lust", label: "戒淫" },
  { value: "quit_latenight", label: "戒熬夜" },
];

const CATEGORY_META: Record<string, { emoji: string; desc: string }> = {
  all: { emoji: "🌐", desc: "浏览所有圈子的最新动态" },
  quit_smoke: { emoji: "🚭", desc: "和烟说再见，呼吸更清新的空气" },
  quit_alcohol: { emoji: "🍺", desc: "戒酒同行者，清醒地生活" },
  quit_milktea: { emoji: "🧋", desc: "对奶茶说不，拥抱健康饮食" },
  exercise: { emoji: "🏃", desc: "动起来，让身体充满活力" },
  quit_lust: { emoji: "🧘", desc: "节制欲望，找回内心的平静" },
  quit_latenight: { emoji: "🌙", desc: "早睡早起，告别熬夜疲惫" },
  experience: { emoji: "💡", desc: "分享自律路上的真实心得" },
  question: { emoji: "❓", desc: "遇到困难，向同行者求助" },
  milestone: { emoji: "🏁", desc: "纪念每一个突破的瞬间" },
  encourage: { emoji: "💪", desc: "互相加油，传递正能量" },
};

const CATEGORY_STORAGE_KEY = "community_default_category";

const DISCIPLINE_CATEGORIES = new Set([
  "quit_smoke",
  "quit_alcohol",
  "quit_milktea",
  "exercise",
  "quit_lust",
  "quit_latenight",
]);

function categoryLabel(v: string) {
  if (v === "all") return "全部社区";
  return categories.find((c) => c.value === v)?.label ?? v;
}

function computeDays(start: string | null): number {
  if (!start) return 1;
  const d0 = new Date(start + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - d0.getTime()) / 86400000)) + 1;
}

function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<{ id: string; userId: string } | null>(null);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  const toggleComments = (id: string) => setOpenComments((s) => {
    const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  useEffect(() => {
    if (!user) { setBlockedIds(new Set()); return; }
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id).then(({ data }) => {
      setBlockedIds(new Set((data ?? []).map((r) => r.blocked_id)));
    });
  }, [user]);

  const blockUser = async (uid: string) => {
    if (!user) return toast.error("请先登录");
    if (uid === user.id) return;
    if (!window.confirm("屏蔽后将不再看到 TA 的内容")) return;
    await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: uid });
    setBlockedIds((s) => new Set([...s, uid]));
    setPosts((prev) => prev.filter((p) => p.user_id !== uid));
    toast.success("已屏蔽");
  };

  // On first mount: read saved category, or show picker
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (saved) {
      setFilter(saved);
    } else {
      setPickerOpen(true);
    }
  }, []);

  const chooseCategory = (value: string) => {
    setFilter(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CATEGORY_STORAGE_KEY, value);
    }
    setPickerOpen(false);
  };

  type RankRow = {
    user_id: string;
    count: number;
    username: string | null;
    avatar_url: string | null;
    quit_start_date: string | null;
    pet?: { pet_type: PetSpecies; nickname: string } | null;
  };
  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [rankLoading, setRankLoading] = useState(true);

  const loadRanking = async () => {
    setRankLoading(true);
    // get all distinct users that have checkins via profiles + RPC
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, quit_start_date");
    const ids = (profs ?? []).map((p) => p.id);
    if (ids.length === 0) {
      setRanking([]);
      setRankLoading(false);
      return;
    }
    const isDiscipline = DISCIPLINE_CATEGORIES.has(filter);
    const [countsRes, petsRes] = await Promise.all([
      isDiscipline
        ? supabase.rpc("get_category_checkin_counts", { _user_ids: ids, _category: filter })
        : supabase.rpc("get_checkin_counts", { _user_ids: ids }),
      supabase.from("user_pets").select("user_id, pet_type, nickname").in("user_id", ids),
    ]);
    const profMap = new Map(
      (profs ?? []).map((p) => [p.id, p] as const),
    );
    const validSpecies = new Set(PET_CATALOG.map((p) => p.id));
    const petMap = new Map<string, { pet_type: PetSpecies; nickname: string }>();
    (petsRes.data ?? []).forEach((p) => {
      if (validSpecies.has(p.pet_type as PetSpecies)) {
        petMap.set(p.user_id, { pet_type: p.pet_type as PetSpecies, nickname: p.nickname });
      }
    });
    const rows: RankRow[] = ((countsRes.data ?? []) as { user_id: string; count: number }[])
      .map((r) => {
        const p = profMap.get(r.user_id);
        return {
          user_id: r.user_id,
          count: Number(r.count),
          username: p?.username ?? null,
          avatar_url: p?.avatar_url ?? null,
          quit_start_date: p?.quit_start_date ?? null,
          pet: petMap.get(r.user_id) ?? null,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setRanking(rows);
    setRankLoading(false);
  };

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (filter !== "all") query = query.eq("category", filter);
    const { data, error } = await query;
    if (error) {
      toast.error("加载失败:" + error.message);
      setLoading(false);
      return;
    }
    const ids = (data ?? []).map((p) => p.id);
    const userIds = Array.from(new Set((data ?? []).map((p) => p.user_id)));
    const isDiscipline = DISCIPLINE_CATEGORIES.has(filter);
    const [likesRes, commentsRes, myLikesRes, profilesRes, petsRes, catCountsRes] = await Promise.all([
      supabase.from("likes").select("post_id").in("post_id", ids),
      supabase.from("comments").select("post_id").in("post_id", ids),
      user
        ? supabase.from("likes").select("post_id").in("post_id", ids).eq("user_id", user.id)
        : Promise.resolve({ data: [] as { post_id: string }[] }),
      userIds.length
        ? supabase.from("profiles").select("id, username, avatar_url, quit_start_date").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; username: string; avatar_url: string | null; quit_start_date: string | null }[] }),
      userIds.length
        ? supabase.from("user_pets").select("user_id, pet_type, nickname").in("user_id", userIds)
        : Promise.resolve({ data: [] as { user_id: string; pet_type: string; nickname: string }[] }),
      isDiscipline && userIds.length
        ? supabase.rpc("get_category_checkin_counts", { _user_ids: userIds, _category: filter })
        : Promise.resolve({ data: [] as { user_id: string; count: number }[] }),
    ]);
    const catCountMap = new Map<string, number>();
    ((catCountsRes.data ?? []) as { user_id: string; count: number }[]).forEach((r) =>
      catCountMap.set(r.user_id, Number(r.count)),
    );
    const profileMap = new Map<string, { username: string; avatar_url: string | null; quit_start_date: string | null }>();
    (profilesRes.data ?? []).forEach((p) => profileMap.set(p.id, { username: p.username, avatar_url: p.avatar_url, quit_start_date: p.quit_start_date }));
    const validSpecies = new Set(PET_CATALOG.map((p) => p.id));
    const petMap = new Map<string, { pet_type: PetSpecies; nickname: string }>();
    (petsRes.data ?? []).forEach((p) => {
      if (validSpecies.has(p.pet_type as PetSpecies)) {
        petMap.set(p.user_id, { pet_type: p.pet_type as PetSpecies, nickname: p.nickname });
      }
    });
    const likeMap = new Map<string, number>();
    (likesRes.data ?? []).forEach((l) => likeMap.set(l.post_id, (likeMap.get(l.post_id) ?? 0) + 1));
    const commentMap = new Map<string, number>();
    (commentsRes.data ?? []).forEach((c) => commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1));
    const myLikes = new Set((myLikesRes.data ?? []).map((l) => l.post_id));
    setPosts(
      (data ?? []).map((p) => {
        const prof = profileMap.get(p.user_id) ?? null;
        const days = isDiscipline
          ? (catCountMap.get(p.user_id) ?? 0)
          : computeDays(prof?.quit_start_date ?? null);
        return {
          ...(p as Omit<Post, "profiles" | "likes_count" | "comments_count" | "liked" | "author_days" | "author_stage" | "author_pet">),
          profiles: prof ? { username: prof.username, avatar_url: prof.avatar_url } : null,
          author_days: days,
          author_stage: stageFromDays(days),
          author_pet: petMap.get(p.user_id) ?? null,
          likes_count: likeMap.get(p.id) ?? 0,
          comments_count: commentMap.get(p.id) ?? 0,
          liked: myLikes.has(p.id),
        };
      }),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, authLoading, user?.id]);

  useEffect(() => {
    if (!authLoading) loadRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, filter]);

  const toggleLike = async (post: Post) => {
    if (!user) {
      toast.error("请先登录");
      return;
    }
    if (post.liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked: !p.liked, likes_count: (p.likes_count ?? 0) + (p.liked ? -1 : 1) }
          : p,
      ),
    );
  };

  const deletePost = async (post: Post) => {
    if (!user || user.id !== post.user_id) return;
    if (!window.confirm("确定要删除这条作品吗?此操作不可撤销。")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("已删除");
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl">心得社区</h1>
            <p className="mt-1 text-sm text-muted-foreground">分享你的旅程,鼓励同行的人。</p>
            <button
              onClick={() => setPickerOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-smooth hover:border-primary hover:text-primary"
            >
              <span>{CATEGORY_META[filter]?.emoji ?? "🌐"}</span>
              <span>当前圈子:{categoryLabel(filter)}</span>
              <span className="text-[10px] opacity-70">切换 ›</span>
            </button>
          </div>
          {user ? (
            <button
              onClick={() => setShowForm((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-smooth hover:shadow-glow"
            >
              <Plus className="h-4 w-4" />
              发布
            </button>
          ) : (
            <Link to="/auth" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm">
              登录后发布
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[{ value: "all", label: "全部" }, ...categories].map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`rounded-full border px-4 py-1.5 text-xs transition-smooth ${
                filter === c.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Check-in Leaderboard */}
        <section className="mt-6 rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg">打卡排行榜</h2>
            <span className="text-xs text-muted-foreground">· 累计打卡天数 Top 10</span>
          </div>
          {rankLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">加载中...</p>
          ) : ranking.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">还没有人打卡,快去成为第一名!</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {ranking.map((r, i) => {
                const days = computeDays(r.quit_start_date);
                const stage = stageFromDays(days);
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
                return (
                  <li
                    key={r.user_id}
                    className="flex items-center gap-3 rounded-2xl border border-border/40 bg-background/60 px-3 py-2"
                  >
                    <span className={`w-10 shrink-0 text-center text-sm font-semibold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                      {medal}
                    </span>
                    <AvatarWithPet
                      userId={r.user_id}
                      avatarUrl={r.avatar_url}
                      username={r.username}
                      petSpecies={r.pet?.pet_type ?? null}
                      petStage={stage}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="truncate font-medium">{r.username ?? "匿名同行"}</span>
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          Lv.{stage + 1}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">坚持 {days} 天</p>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg leading-none text-primary">{r.count}</div>
                      <div className="text-[10px] text-muted-foreground">次打卡</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {showForm && user && (
          <NewPostForm
            defaultCategory={filter !== "all" ? filter : "experience"}
            lockCategory={filter !== "all"}
            onCreated={() => { setShowForm(false); load(); }}
          />
        )}

        {/* Posts */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-border/60 bg-card p-12 text-center text-sm text-muted-foreground">加载中...</div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">还没有帖子,成为第一个分享的人吧。</p>
            </div>
          ) : (
            posts.filter((p) => !blockedIds.has(p.user_id)).map((post) => (
              <article
                key={post.id}
                className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft transition-smooth hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <AvatarWithPet
                    userId={post.user_id}
                    avatarUrl={post.profiles?.avatar_url ?? null}
                    username={post.profiles?.username ?? null}
                    petSpecies={post.author_pet?.pet_type ?? null}
                    petStage={(post.author_stage ?? 0) as PetStage}
                    size={52}
                    editable={user?.id === post.user_id}
                    onUpdated={() => load()}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm">
                      <Link to="/u/$userId" params={{ userId: post.user_id }} className="font-medium text-foreground truncate hover:text-primary">
                        {post.profiles?.username ?? "匿名同行"}
                      </Link>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Lv.{(post.author_stage ?? 0) + 1} · {STAGE_LABELS[post.author_stage ?? 0]}
                      </span>
                      {post.author_pet && (
                        <span className="text-[10px] text-muted-foreground">
                          🐾 {post.author_pet.nickname}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                        {categoryLabel(post.category)}
                      </span>
                      <span>·</span>
                      <span>坚持 {post.author_days ?? 1} 天</span>
                      <span>·</span>
                      <span>{new Date(post.created_at).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                  {user && user.id !== post.user_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setReportTarget({ id: post.id, userId: post.user_id })}>
                          <Flag className="mr-2 h-4 w-4" /> 举报
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => blockUser(post.user_id)}>
                          <ShieldOff className="mr-2 h-4 w-4" /> 屏蔽该用户
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <h2 className="mt-3 font-display text-xl">{post.title}</h2>
                {post.featured && (
                  <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px]">
                    <Star className="h-3 w-3 fill-current" /> 官方精选
                  </span>
                )}
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{post.content}</p>
                {post.image_url && (
                  <img src={post.image_url} alt="" loading="lazy"
                    className="mt-3 max-h-96 w-full rounded-2xl object-cover border border-border/40" />
                )}
                <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
                  <button
                    onClick={() => toggleLike(post)}
                    className={`inline-flex items-center gap-1.5 transition-smooth hover:text-primary ${post.liked ? "text-primary" : ""}`}
                  >
                    <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} />
                    {post.likes_count}
                  </button>
                  <button onClick={() => toggleComments(post.id)} className="inline-flex items-center gap-1.5 transition-smooth hover:text-primary">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments_count}
                  </button>
                  {user?.id === post.user_id && (
                    <button
                      onClick={() => deletePost(post)}
                      className="ml-auto inline-flex items-center gap-1.5 transition-smooth hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  )}
                </div>
                {openComments.has(post.id) && (
                  <PostComments
                    postId={post.id}
                    onCountChange={(d) => setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, comments_count: Math.max(0, (p.comments_count ?? 0) + d) } : p))}
                  />
                )}
              </article>
            ))
          )}
        </div>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">选择你的自律项目</DialogTitle>
            <DialogDescription>
              先告诉我们你想关注什么,我们会带你进入对应的社区圈子。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pr-1">
            {[{ value: "all", label: "全部社区" }, ...categories].map((c) => {
              const meta = CATEGORY_META[c.value] ?? { emoji: "✨", desc: "" };
              const active = filter === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => chooseCategory(c.value)}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-smooth ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{meta.emoji}</span>
                    <span className="text-sm font-medium">
                      {c.value === "all" ? "全部社区" : c.label}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-muted-foreground">{meta.desc}</p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {reportTarget && (
        <ReportDialog
          open={!!reportTarget}
          onOpenChange={(v) => !v && setReportTarget(null)}
          targetType="post"
          targetId={reportTarget.id}
          targetUserId={reportTarget.userId}
        />
      )}
    </AppShell>
  );
}

function NewPostForm({
  onCreated,
  defaultCategory = "experience",
  lockCategory = false,
}: {
  onCreated: () => void;
  defaultCategory?: string;
  lockCategory?: boolean;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const onPickImage = (f: File | null) => {
    if (!f) { setImageFile(null); setImagePreview(null); return; }
    if (f.size > 5 * 1024 * 1024) return toast.error("图片不能超过 5MB");
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (title.trim().length < 2) return toast.error("标题太短");
    if (content.trim().length < 5) return toast.error("内容太短");
    const mod = await moderateText(`${title}\n${content}`);
    if (!mod.ok) return toast.error("内容不符合社区规范，请修改后再发布");
    setSubmitting(true);
    let image_url: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("post-images").upload(path, imageFile, { contentType: imageFile.type });
      if (upErr) { setSubmitting(false); return toast.error("图片上传失败：" + upErr.message); }
      const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);
      image_url = pub.publicUrl;
    }
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      category,
      image_url,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("已发布");
    setTitle("");
    setContent("");
    setImageFile(null);
    setImagePreview(null);
    onCreated();
  };

  return (
    <form onSubmit={submit} className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-soft animate-fade-up">
      {lockCategory ? (
        <div className="mb-4 text-xs text-muted-foreground">
          发布到分类:
          <span className="ml-2 inline-flex items-center rounded-full border border-primary bg-primary/10 px-3 py-1 text-primary">
            {categoryLabel(category)}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-full border px-3 py-1 text-xs transition-smooth ${
                category === c.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        maxLength={80}
        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="分享你的心得、感受或问题..."
        rows={5}
        maxLength={2000}
        className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary resize-none"
      />
      {imagePreview && (
        <div className="mt-3 relative inline-block">
          <img src={imagePreview} alt="预览" className="max-h-48 rounded-xl border border-border" />
          <button type="button" onClick={() => onPickImage(null)} className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1 cursor-pointer rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-primary hover:border-primary transition-smooth">
            <ImageIcon className="h-3.5 w-3.5" /> 图片
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0] ?? null)} />
          </label>
          <span className="text-xs text-muted-foreground">{content.length}/2000</span>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-gradient-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-smooth hover:shadow-glow disabled:opacity-60"
        >
          {submitting ? "发布中..." : "发 布"}
        </button>
      </div>
    </form>
  );
}
