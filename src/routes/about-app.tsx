import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/about-app")({
  head: () => ({ meta: [{ title: "关于清心" }, { name: "description", content: "关于清心 App" }] }),
  component: AboutAppPage,
});

function AboutAppPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Link to="/profile" className="text-xs text-muted-foreground">← 返回</Link>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Leaf className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-2xl">清心</h1>
          <p className="text-xs text-muted-foreground">版本 v1.0.0</p>
        </div>
      </div>

      <p className="mt-6 text-sm leading-7 text-foreground/90">
        清心是一款陪你走过自律之路的温柔伙伴。无论你想戒烟、戒酒、戒奶茶，或只是想找回内心的宁静，
        都可以在这里打卡、记录心情、与同行者互相鼓励。
      </p>

      <div className="mt-8 space-y-3 text-sm">
        <Link to="/terms" className="block rounded-2xl border border-border/60 bg-card px-4 py-3 transition-smooth hover:bg-muted/30">用户协议</Link>
        <Link to="/privacy" className="block rounded-2xl border border-border/60 bg-card px-4 py-3 transition-smooth hover:bg-muted/30">隐私政策</Link>
        <Link to="/privacy/collection" className="block rounded-2xl border border-border/60 bg-card px-4 py-3 transition-smooth hover:bg-muted/30">个人信息收集清单</Link>
        <Link to="/privacy/sdk" className="block rounded-2xl border border-border/60 bg-card px-4 py-3 transition-smooth hover:bg-muted/30">第三方 SDK 目录</Link>
        <Link to="/teen-mode" className="block rounded-2xl border border-border/60 bg-card px-4 py-3 transition-smooth hover:bg-muted/30">青少年模式</Link>
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground text-center leading-relaxed">
        ICP 备案号：暂未取得 · 网络文化经营许可：暂未取得
        <br />运营主体：清心团队 · 客服：通过「我的 → 意见反馈」联系
      </p>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        © 2026 清心 · 愿每一颗心都重获自由与宁静
      </p>
    </div>
  );
}