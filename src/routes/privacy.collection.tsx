import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy/collection")({
  head: () => ({
    meta: [
      { title: "个人信息收集清单 — 清心" },
      { name: "description", content: "清心收集的所有个人信息及使用场景。" },
    ],
  }),
  component: CollectionPage,
});

const ROWS: { item: string; purpose: string; scene: string; storage: string; required: string }[] = [
  { item: "手机号", purpose: "账号注册、实名校验、安全验证", scene: "注册 / 登录 / 找回密码", storage: "注销后立即删除", required: "必需" },
  { item: "邮箱", purpose: "邮箱登录、安全通知", scene: "邮箱注册 / 登录", storage: "注销后立即删除", required: "可选" },
  { item: "昵称、头像、简介", purpose: "在社区中展示你的身份", scene: "社区互动、个人主页", storage: "注销后立即删除", required: "必需" },
  { item: "打卡记录、自律分类", purpose: "为你生成数据统计、成就勋章", scene: "打卡、统计、成就", storage: "注销后立即删除", required: "必需" },
  { item: "帖子、评论、点赞", purpose: "社区互动、消息通知", scene: "社区", storage: "注销后立即删除", required: "可选" },
  { item: "匿名树洞内容", purpose: "情绪宣泄、互相支持", scene: "树洞", storage: "注销后立即删除", required: "可选" },
  { item: "上传图片", purpose: "头像、社区帖子配图", scene: "头像、发帖", storage: "存储于云端,删除后不可恢复", required: "可选" },
  { item: "与 AI 宠物的对话", purpose: "提供个性化陪伴回复", scene: "宠物聊天", storage: "仅当次会话内存,不持久化", required: "可选" },
  { item: "设备网络信息", purpose: "服务运行所需的最小范围", scene: "全局", storage: "请求结束后即丢弃", required: "必需" },
];

function CollectionPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 text-sm leading-7 text-foreground/90">
      <Link to="/about-app" className="text-xs text-muted-foreground">← 返回</Link>
      <h1 className="mt-3 font-display text-3xl">个人信息收集清单</h1>
      <p className="mt-1 text-xs text-muted-foreground">最后更新：2026-05-08</p>
      <p className="mt-4 text-muted-foreground">
        以下列出清心在产品功能中收集和使用的全部个人信息。我们承诺：仅收集为实现产品功能所必需的最少信息,不会用于产品功能之外的目的。
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">信息类型</th>
              <th className="px-3 py-2 font-medium">使用目的</th>
              <th className="px-3 py-2 font-medium">场景</th>
              <th className="px-3 py-2 font-medium">存储期限</th>
              <th className="px-3 py-2 font-medium">是否必需</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={i} className="border-t border-border/40">
                <td className="px-3 py-2 align-top font-medium">{r.item}</td>
                <td className="px-3 py-2 align-top text-muted-foreground">{r.purpose}</td>
                <td className="px-3 py-2 align-top text-muted-foreground">{r.scene}</td>
                <td className="px-3 py-2 align-top text-muted-foreground">{r.storage}</td>
                <td className="px-3 py-2 align-top">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${r.required === "必需" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{r.required}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-display text-lg">你的权利</h2>
      <ul className="mt-2 list-disc pl-5 text-muted-foreground">
        <li>查看：在「我的」页面随时查看个人资料、打卡、帖子、评论</li>
        <li>更正：可在个人资料页修改昵称、头像、简介</li>
        <li>删除：可单独删除自己的帖子、评论、打卡记录</li>
        <li>注销：在「我的 → 注销账号」一键删除全部数据,不可恢复</li>
      </ul>

      <p className="mt-8 text-xs text-muted-foreground">
        如对个人信息处理有任何疑问,请通过「我的 → 意见反馈」联系我们,我们将在 15 个工作日内回复。
      </p>
    </div>
  );
}