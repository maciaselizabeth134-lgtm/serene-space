import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "我的 — 清心" },
      { name: "description", content: "管理你的资料和自律记录。" },
    ],
  }),
  component: ProfilePage,
});

type Profile = { id: string; username: string; bio: string | null; quit_start_date: string | null };

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
          setUsername(data.username ?? "");
          setBio(data.bio ?? "");
          setStartDate(data.quit_start_date ?? "");
        }
      });
    }
  }, [user, authLoading]);

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
      </div>
    </AppShell>
  );
}
