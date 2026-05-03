import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "隐私政策 — 清心" }, { name: "description", content: "清心隐私政策" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 text-sm leading-7 text-foreground/90">
      <Link to="/" className="text-xs text-muted-foreground">← 返回</Link>
      <h1 className="mt-3 font-display text-3xl">隐私政策</h1>
      <p className="mt-1 text-xs text-muted-foreground">最后更新：2026-05</p>

      <h2 className="mt-6 font-display text-lg">一、我们收集的信息</h2>
      <ul className="list-disc pl-5">
        <li>账号信息：邮箱、密码（加密存储）、昵称、头像、个人简介</li>
        <li>使用数据：打卡记录、自律分类、发帖、评论、点赞、树洞内容</li>
        <li>设备信息：仅用于服务运行所需的最少范围</li>
      </ul>

      <h2 className="mt-6 font-display text-lg">二、我们如何使用信息</h2>
      <p>用于提供产品功能（打卡统计、社区互动、AI 陪伴）、保障账户安全、改进服务体验。我们不会将你的个人信息出售给第三方。</p>

      <h2 className="mt-6 font-display text-lg">三、第三方服务</h2>
      <p>本应用使用以下第三方服务以提供功能：</p>
      <ul className="list-disc pl-5">
        <li>Lovable Cloud：账号、数据库、文件存储</li>
        <li>Lovable AI：宠物对话与内容审核</li>
      </ul>

      <h2 className="mt-6 font-display text-lg">四、内容审核</h2>
      <p>为维护社区健康，我们会对你提交的文本（昵称、帖子、评论、树洞、反馈）进行自动化审核，违规内容将被拒绝发布。</p>

      <h2 className="mt-6 font-display text-lg">五、未成年人保护</h2>
      <p>本应用主要面向成年人，未成年人请在监护人同意后使用。我们不会主动收集未成年人的敏感信息。</p>

      <h2 className="mt-6 font-display text-lg">六、你的权利</h2>
      <p>你可以随时在"我的 → 个人资料"修改信息；可在"我的 → 注销账号"中删除账号及所有相关数据，操作不可撤销。</p>

      <h2 className="mt-6 font-display text-lg">七、数据安全</h2>
      <p>我们采用加密传输、行级访问控制等措施保护你的数据。但任何互联网传输都无法 100% 安全，请妥善保管你的账号。</p>

      <h2 className="mt-6 font-display text-lg">八、联系我们</h2>
      <p>如有隐私相关疑问，请通过"我的 → 意见反馈"联系我们。</p>
    </div>
  );
}