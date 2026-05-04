import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User as UserIcon, MessageSquarePlus, Heart, MessageCircle, FileText, Trash2, ChevronDown, Info, ShieldAlert, Inbox, Trophy, BarChart3, Search, Users } from "lucide-react";
import { moderateText } from "@/lib/moderation";
import { AvatarWithPet } from "@/components/AvatarWithPet";
import { PET_CATALOG, stageFromDays, type PetSpecies, type PetStage } from "@/components/PetCreature";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "我的 — 清心" },
      { name: "description", content: "管理你的资料和自律记录。" },
    ],
  }),
  component: ProfilePage,
});

type Profile = { id: string; username: string; bio: string | null; quit_start_date: string | null; avatar_url: string | null };

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pet, setPet] = useState<{ species: PetSpecies; stage: PetStage } | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
          setUsername(data.username ?? "");
          setBio(data.bio ?? "");
          setStartDate(data.quit_start_date ?? "");
          setAvatarUrl(data.avatar_url ?? null);
        }
      });
      supabase.from("user_pets").select("pet_type").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        const valid = new Set(PET_CATALOG.map((p) => p.id));
        if (data && valid.has(data.pet_type as PetSpecies)) {
          setPet({ species: data.pet_type as PetSpecies, stage: 0 });
        }
      });
    }
  }, [user, authLoading]);

  // Update pet stage when start date changes
  useEffect(() => {
    if (!pet) return;
    if (!startDate) return;
    const d0 = new Date(startDate + "T00:00:00");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.max(0, Math.round((today.getTime() - d0.getTime()) / 86400000)) + 1;
    setPet((p) => (p ? { ...p, stage: stageFromDays(days) } : p));
  }, [startDate, pet?.species]);

  if (!authLoading && !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserIcon className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl">尚未登录</h1>
          <p className="mt-2 text-sm text-muted-foreground">登录后即可使用全部功能。</p>
          <Link to="/auth" className="mt-6 inline-block rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-soft">
            登录 / 注册
          </Link>
        </div>
      </AppShell>
    );
  }

  const save = async () => {
    if (!user) return;
    if (username.trim().length < 1) return toast.error("昵称不能为空");
    const mod = await moderateText(`${username} ${bio}`);
    if (!mod.ok) return toast.error("内容不符合社区规范，请修改后再保存");
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      username: username.trim(),
      bio: bio.trim() || null,
      quit_start_date: startDate || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("已保存");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("已退出登录");
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl">个人资料</h1>

        <div className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-soft space-y-4">
          <div className="flex flex-col items-center gap-3 pb-2">
            {user && (
              <AvatarWithPet
                userId={user.id}
                avatarUrl={avatarUrl}
                username={username}
                petSpecies={pet?.species ?? null}
                petStage={pet?.stage ?? 0}
                size={112}
                editable
                onUpdated={(url) => setAvatarUrl(url)}
              />
            )}
            <p className="text-xs text-muted-foreground">点击头像更换图片</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">邮箱</label>
            <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">昵称</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">个人简介</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="说说你自己,或写下你的自律宣言..."
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">自律起始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-full bg-gradient-primary py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-smooth hover:shadow-glow disabled:opacity-60"
          >
            {saving ? "保存中..." : "保存修改"}
          </button>
        </div>

        <button
          onClick={logout}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-2.5 text-sm text-muted-foreground transition-smooth hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> 退出登录
        </button>

        <FeedbackSection />
        {user && <QuickToolsSection userId={user.id} />}
        {user && <MyActivitySection userId={user.id} />}
        {user && <MyFeedbackSection userId={user.id} />}
        <AboutLink />
        {user && <DeleteAccountSection />}
      </div>
    </AppShell>
  );
}

const FEEDBACK_CATEGORIES = [
  { value: "suggestion", label: "功能建议" },
  { value: "bug", label: "问题反馈" },
  { value: "experience", label: "使用体验" },
  { value: "other", label: "其他" },
];

function AboutLink() {
  return (
    <Link
      to="/about-app"
      className="mt-6 flex w-full items-center gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition-smooth hover:bg-muted/30"
    >
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Info className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-lg">关于清心</h2>
        <p className="text-xs text-muted-foreground">版本信息、用户协议与隐私政策。</p>
      </div>
      <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
    </Link>
  );
}

function MyFeedbackSection({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<{ id: string; content: string; reply: string | null; status: string; created_at: string; replied_at: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("feedback")
      .select("id, content, reply, status, created_at, replied_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setList((data ?? []) as typeof list);
        setLoading(false);
      });
  }, [open, userId]);

  return (
    <section className="mt-6 rounded-3xl border border-border/60 bg-card shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-5 text-left transition-smooth hover:bg-muted/30"
      >
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Inbox className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-lg">我的反馈</h2>
          <p className="text-xs text-muted-foreground">查看你提交过的反馈与官方回复。</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-2">
          {loading ? (
            <p className="py-6 text-center text-xs text-muted-foreground">加载中…</p>
          ) : list.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">还没有提交过反馈</p>
          ) : list.map((f) => (
            <div key={f.id} className="rounded-2xl border border-border/60 bg-background p-4">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{new Date(f.created_at).toLocaleDateString("zh-CN")}</span>
                <span className={`rounded-full px-2 py-0.5 ${f.status === "replied" ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                  {f.status === "replied" ? "已回复" : "处理中"}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{f.content}</p>
              {f.reply && (
                <div className="mt-2 rounded-xl bg-primary/5 px-3 py-2 text-xs">
                  <span className="font-medium text-primary">官方回复：</span>
                  <span className="ml-1 whitespace-pre-wrap">{f.reply}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DeleteAccountSection() {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const onDelete = async () => {
    if (!window.confirm("确定要永久注销账号吗？\n所有打卡、帖子、宠物、头像、评论将被删除，且无法恢复。")) return;
    if (!window.confirm("最后一次确认：真的要删除账号吗？")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
    if (error || data?.error) {
      setBusy(false);
      toast.error(data?.error || error?.message || "注销失败，请重试");
      return;
    }
    await supabase.auth.signOut();
    toast.success("账号已注销");
    navigate({ to: "/" });
  };

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-destructive/30 bg-card py-2.5 text-sm text-destructive transition-smooth hover:bg-destructive/10 disabled:opacity-60"
    >
      <ShieldAlert className="h-4 w-4" /> {busy ? "正在注销…" : "注销账号"}
    </button>
  );
}

function FeedbackSection() {
  const { user } = useAuth();
  const [category, setCategory] = useState("suggestion");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("请先登录");
    if (content.trim().length < 5) return toast.error("请至少输入 5 个字");
    const mod = await moderateText(content);
    if (!mod.ok) return toast.error("内容不符合社区规范，请修改后再提交");
    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      category,
      content: content.trim(),
      contact: contact.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("感谢你的反馈,我们已收到 💛");
    setContent("");
    setContact("");
  };

  return (
    <section className="mt-6 rounded-3xl border border-border/60 bg-card shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-5 text-left transition-smooth hover:bg-muted/30"
      >
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquarePlus className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-lg">意见反馈</h2>
          <p className="text-xs text-muted-foreground">告诉我们你的想法,让平台变得更好。</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
      <form onSubmit={submit} className="px-5 pb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-full border px-3 py-1 text-xs transition-smooth ${
                category === c.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="详细描述你的建议、问题或想法…"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary resize-none"
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={120}
          placeholder="联系方式(选填,方便我们回复你)"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{content.length}/1000</span>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-gradient-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-smooth hover:shadow-glow disabled:opacity-60"
          >
            {submitting ? "提交中…" : "提交反馈"}
          </button>
        </div>
      </form>
      )}
    </section>
  );
}

type TabKey = "posts" | "comments" | "likes";

type MyPost = { id: string; title: string; content: string; created_at: string; category: string };
type MyComment = { id: string; content: string; created_at: string; post_id: string; post_title?: string };
type MyLike = { post_id: string; created_at: string; post_title?: string };

function MyActivitySection({ userId }: { userId: string }) {
  const [tab, setTab] = useState<TabKey>("posts");
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);
  const [likes, setLikes] = useState<MyLike[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    if (tab === "posts") {
      const { data } = await supabase
        .from("posts")
        .select("id, title, content, created_at, category")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setPosts((data ?? []) as MyPost[]);
    } else if (tab === "comments") {
      const { data } = await supabase
        .from("comments")
        .select("id, content, created_at, post_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as MyComment[];
      const ids = Array.from(new Set(list.map((c) => c.post_id)));
      if (ids.length) {
        const { data: ps } = await supabase.from("posts").select("id, title").in("id", ids);
        const m = new Map((ps ?? []).map((p) => [p.id, p.title]));
        list.forEach((c) => (c.post_title = m.get(c.post_id)));
      }
      setComments(list);
    } else {
      const { data } = await supabase
        .from("likes")
        .select("post_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as MyLike[];
      const ids = Array.from(new Set(list.map((l) => l.post_id)));
      if (ids.length) {
        const { data: ps } = await supabase.from("posts").select("id, title").in("id", ids);
        const m = new Map((ps ?? []).map((p) => [p.id, p.title]));
        list.forEach((l) => (l.post_title = m.get(l.post_id)));
      }
      setLikes(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, userId, open]);

  const deletePost = async (id: string) => {
    if (!window.confirm("确定要删除这条作品吗?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("已删除");
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const deleteComment = async (id: string) => {
    if (!window.confirm("确定要删除这条评论吗?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("已删除");
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const unlike = async (postId: string) => {
    const { error } = await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) return toast.error(error.message);
    setLikes((prev) => prev.filter((l) => l.post_id !== postId));
  };

  const tabs: { key: TabKey; label: string; icon: typeof Heart }[] = [
    { key: "posts", label: "我的发言", icon: FileText },
    { key: "comments", label: "我的评论", icon: MessageCircle },
    { key: "likes", label: "我的点赞", icon: Heart },
  ];

  return (
    <section className="mt-6 rounded-3xl border border-border/60 bg-card shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-5 text-left transition-smooth hover:bg-muted/30"
      >
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-lg">我的动态</h2>
          <p className="text-xs text-muted-foreground">查看你的发言、评论和点赞。</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
      <div className="px-5 pb-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-smooth ${
                active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">加载中…</p>
        ) : tab === "posts" ? (
          posts.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">还没有发布过作品</p>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border/60 bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{p.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{p.content}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <button
                    onClick={() => deletePost(p.id)}
                    className="text-muted-foreground hover:text-destructive transition-smooth"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )
        ) : tab === "comments" ? (
          comments.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">还没有发表过评论</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border/60 bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">在 「{c.post_title ?? "已删除作品"}」</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{c.content}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="text-muted-foreground hover:text-destructive transition-smooth"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )
        ) : likes.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">还没有点赞过任何作品</p>
        ) : (
          likes.map((l) => (
            <div key={l.post_id} className="rounded-2xl border border-border/60 bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{l.post_title ?? "已删除作品"}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(l.created_at).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <button
                  onClick={() => unlike(l.post_id)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-destructive transition-smooth"
                >
                  <Heart className="h-4 w-4 fill-current" />
                  取消
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
      )}
    </section>
  );
}
