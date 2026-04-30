import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User as UserIcon, MessageSquarePlus, Heart, MessageCircle, FileText, Trash2 } from "lucide-react";
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
        {user && <MyActivitySection userId={user.id} />}
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

function FeedbackSection() {
  const { user } = useAuth();
  const [category, setCategory] = useState("suggestion");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("请先登录");
    if (content.trim().length < 5) return toast.error("请至少输入 5 个字");
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
    <section className="mt-10 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquarePlus className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-display text-lg">意见反馈</h2>
          <p className="text-xs text-muted-foreground">告诉我们你的想法,让平台变得更好。</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
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
    </section>
  );
}
