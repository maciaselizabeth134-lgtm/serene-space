import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy/sdk")({
  head: () => ({
    meta: [
      { title: "第三方 SDK 目录 — 清心" },
      { name: "description", content: "清心使用的所有第三方 SDK 与服务。" },
    ],
  }),
  component: SdkPage,
});

const SDK: { name: string; vendor: string; purpose: string; data: string; link: string }[] = [
  { name: "Lovable Cloud (Supabase)", vendor: "Lovable AB / Supabase Inc.", purpose: "账号、数据库、文件存储、实时通信", data: "账号信息、用户内容、设备 IP", link: "https://supabase.com/privacy" },
  { name: "Lovable AI Gateway", vendor: "Lovable AB", purpose: "AI 宠物对话、文本/图片内容审核", data: "用户输入文本、上传图片(临时,不持久化)", link: "https://lovable.dev/privacy" },
  { name: "Cloudflare CDN", vendor: "Cloudflare, Inc.", purpose: "静态资源加速、边缘计算", data: "请求 IP、UA(不持久化)", link: "https://www.cloudflare.com/privacypolicy/" },
];

function SdkPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 text-sm leading-7 text-foreground/90">
      <Link to="/about-app" className="text-xs text-muted-foreground">← 返回</Link>
      <h1 className="mt-3 font-display text-3xl">第三方 SDK 目录</h1>
      <p className="mt-1 text-xs text-muted-foreground">最后更新：2026-05-08</p>
      <p className="mt-4 text-muted-foreground">
        为了向你提供更好的服务,清心接入了下列第三方 SDK 或服务。我们已与各服务方签订数据保护协议,要求其严格按照本目录所述用途处理信息。
      </p>

      <div className="mt-6 space-y-3">
        {SDK.map((s, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-base">{s.name}</h2>
              <span className="text-[10px] text-muted-foreground">{s.vendor}</span>
            </div>
            <p className="mt-1 text-xs"><span className="text-muted-foreground">使用目的：</span>{s.purpose}</p>
            <p className="mt-1 text-xs"><span className="text-muted-foreground">收集信息：</span>{s.data}</p>
            <a href={s.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">隐私政策 ↗</a>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        如新增或变更第三方 SDK,我们将在本页面更新并在版本日志中告知用户。
      </p>
    </div>
  );
}