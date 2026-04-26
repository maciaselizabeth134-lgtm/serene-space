import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, FormEvent } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, Heart, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "心得社区 — 清心" },
      { name: "description", content: "分享戒色心得,互相鼓励,共同成长。" },
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
  profiles?: { username: string; avatar_url: string | null } | null;
  likes_count?: number;
  comments_count?: number;
  liked?: boolean;
};

const categories = [
  { value: "experience", label: "心得" },
  { value: "question", label: "求助" },
  { value: "milestone", label: "里程碑" },
  { value: "encourage", label: "鼓励" },
];

function categoryLabel(v: string) {
  return categories.find((c) => c.value === v)?.label ?? v;
}

function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");

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
    const [likesRes, commentsRes, myLikesRes, profilesRes] = await Promise.all([
      supabase.from("likes").select("post_id").in("post_id", ids),
      supabase.from("comments").select("post_id").in("post_id", ids),
      user
        ? supabase.from("likes").select("post_id").in("post_id", ids).eq("user_id", user.id)
        : Promise.resolve({ data: [] as { post_id: string }[] }),
      userIds.length
        ? supabase.from("profiles").select("id, username, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; username: string; avatar_url: string | null }[] }),
    ]);
    const profileMap = new Map<string, { username: string; avatar_url: string | null }>();
    (profilesRes.data ?? []).forEach((p) => profileMap.set(p.id, { username: p.username, avatar_url: p.avatar_url }));
    const likeMap = new Map<string, number>();
    (likesRes.data ?? []).forEach((l) => likeMap.set(l.post_id, (likeMap.get(l.post_id) ?? 0) + 1));
    const commentMap = new Map<string, number>();
    (commentsRes.data ?? []).forEach((c) => commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1));
    const myLikes = new Set((myLikesRes.data ?? []).map((l) => l.post_id));
    setPosts(
      (data ?? []).map((p) => ({
        ...(p as Omit<Post, "profiles" | "likes_count" | "comments_count" | "liked">),
        profiles: profileMap.get(p.user_id) ?? null,
        likes_count: likeMap.get(p.id) ?? 0,
        comments_count: commentMap.get(p.id) ?? 0,
        liked: myLikes.has(p.id),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, authLoading, user?.id]);

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

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl">心得社区</h1>
            <p className="mt-1 text-sm text-muted-foreground">分享你的旅程,鼓励同行的人。</p>
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

        {showForm && user && <NewPostForm onCreated={() => { setShowForm(false); load(); }} />}

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
            posts.map((post) => (
              <article
                key={post.id}
                className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft transition-smooth hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">
                    {categoryLabel(post.category)}
                  </span>
                  <span>·</span>
                  <span>{post.profiles?.username ?? "匿名同行"}</span>
                  <span>·</span>
                  <span>{new Date(post.created_at).toLocaleDateString("zh-CN")}</span>
                </div>
                <h2 className="mt-3 font-display text-xl">{post.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{post.content}</p>
                <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
                  <button
                    onClick={() => toggleLike(post)}
                    className={`inline-flex items-center gap-1.5 transition-smooth hover:text-primary ${post.liked ? "text-primary" : ""}`}
                  >
                    <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} />
                    {post.likes_count}
                  </button>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments_count}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}

function NewPostForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("experience");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (title.trim().length < 2) return toast.error("标题太短");
    if (content.trim().length < 5) return toast.error("内容太短");
    setSubmitting(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      category,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("已发布");
    setTitle("");
    setContent("");
    onCreated();
  };

  return (
    <form onSubmit={submit} className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-soft animate-fade-up">
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
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{content.length}/2000</span>
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
