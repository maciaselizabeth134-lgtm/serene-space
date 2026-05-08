import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Shield, Lock, Moon, Hourglass, Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTeenMode } from "@/lib/use-teen-mode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/teen-mode")({
  head: () => ({
    meta: [
      { title: "青少年模式 — 清心" },
      { name: "description", content: "为未成年用户提供更安全、更健康的使用环境。" },
    ],
  }),
  component: TeenModePage,
});

function TeenModePage() {
  const { user } = useAuth();
  const tm = useTeenMode();
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-2xl">请先登录</h1>
          <Link to="/auth" className="mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2 text-sm text-primary-foreground">去登录</Link>
        </div>
      </AppShell>
    );
  }

  const enable = async () => {
    if (!/^\d{4,6}$/.test(pin)) return toast.error("请设置 4-6 位数字密码");
    if (pin !== pin2) return toast.error("两次输入的密码不一致");
    setBusy(true);
    const { error } = await supabase.from("profiles")
      .update({ teen_mode_enabled: true, teen_mode_pin: pin })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setPin(""); setPin2("");
    toast.success("青少年模式已开启 🛡️");
    tm.refresh();
  };

  const disable = async () => {
    if (!/^\d{4,6}$/.test(pin)) return toast.error("请输入开启时设置的密码");
    setBusy(true);
    const { data } = await supabase.from("profiles").select("teen_mode_pin").eq("id", user.id).single();
    if (data?.teen_mode_pin !== pin) {
      setBusy(false);
      return toast.error("密码不正确");
    }
    const { error } = await supabase.from("profiles")
      .update({ teen_mode_enabled: false })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setPin("");
    toast.success("已关闭青少年模式");
    tm.refresh();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Shield className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mt-4 font-display text-3xl">青少年模式</h1>
          <p className="mt-2 text-sm text-muted-foreground">为未成年用户提供更安全、更健康的使用环境</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Feature icon={Shield} title="内容过滤" desc="社区、匿名树洞、搜索功能不可用" />
          <Feature icon={Hourglass} title="单日 40 分钟" desc="超过后自动锁定,次日重置" />
          <Feature icon={Moon} title="22:00–06:00 禁用" desc="夜间自动锁定,守护睡眠" />
        </div>

        <div className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${tm.enabled ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`} />
            <span className="text-sm">当前状态：{tm.enabled ? "已开启" : "未开启"}</span>
          </div>
          {tm.enabled && (
            <p className="mt-2 text-xs text-muted-foreground">
              今日已使用 {tm.usageMinutes} / {tm.dailyLimit} 分钟
            </p>
          )}

          <div className="mt-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{tm.enabled ? "输入密码以关闭" : "设置 4-6 位数字密码"}</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm tracking-[0.3em] text-center outline-none focus:border-primary"
              />
            </div>
            {!tm.enabled && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">再次输入密码</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm tracking-[0.3em] text-center outline-none focus:border-primary"
                />
              </div>
            )}
            <button
              onClick={tm.enabled ? disable : enable}
              disabled={busy}
              className={`w-full rounded-full py-2.5 text-sm font-medium shadow-soft transition-smooth disabled:opacity-60 ${
                tm.enabled ? "border border-border bg-card text-foreground hover:bg-muted/30" : "bg-gradient-primary text-primary-foreground hover:shadow-glow"
              }`}
            >
              <Lock className="inline h-4 w-4 mr-1.5 -mt-0.5" />
              {busy ? "处理中…" : tm.enabled ? "关闭青少年模式" : "开启青少年模式"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs leading-6 text-muted-foreground">
          <Heart className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-primary" />
          清心承诺保护未成年用户的身心健康。如发现违规内容,请前往「我的 → 意见反馈」举报,我们会在 24 小时内处理。
        </div>
      </div>
    </AppShell>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Shield; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 text-center">
      <div className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-sm font-medium">{title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{desc}</p>
    </div>
  );
}