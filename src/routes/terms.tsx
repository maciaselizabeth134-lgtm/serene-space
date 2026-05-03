import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "用户协议 — 清心" }, { name: "description", content: "清心用户协议" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 text-sm leading-7 text-foreground/90">
      <Link to="/" className="text-xs text-muted-foreground">← 返回</Link>
      <h1 className="mt-3 font-display text-3xl">用户协议</h1>
      <p className="mt-1 text-xs text-muted-foreground">最后更新：2026-05</p>

      <h2 className="mt-6 font-display text-lg">一、服务说明</h2>
      <p>"清心"（以下简称"本应用"）是一款帮助用户进行自律、戒除不良习惯、记录心情和参与互助社区的工具型产品。注册并使用本应用即表示你已阅读、理解并同意本协议全部内容。</p>

      <h2 className="mt-6 font-display text-lg">二、用户资格</h2>
      <p>你须年满 18 周岁，或在监护人同意与陪同下使用本应用。涉及戒烟、戒酒、戒淫等内容仅面向成年人。</p>

      <h2 className="mt-6 font-display text-lg">三、账户与安全</h2>
      <p>请妥善保管账号与密码，账户行为由你本人负责。如发现账号被盗用应立即联系我们。</p>

      <h2 className="mt-6 font-display text-lg">四、用户行为规范</h2>
      <p>你承诺不发布以下内容：色情、政治敏感、辱骂攻击、人身威胁、引流广告、欺诈、毒品、自残教唆、侵犯他人隐私或知识产权的内容。我们有权对违规内容进行删除、限流或封禁账号。</p>

      <h2 className="mt-6 font-display text-lg">五、内容版权</h2>
      <p>你在本应用发布的原创内容版权归你所有，但你授权本应用在产品范围内展示、传播、推荐你的内容。</p>

      <h2 className="mt-6 font-display text-lg">六、免责声明</h2>
      <p>本应用提供的内容仅作信息分享与陪伴，不构成医学、心理或法律建议。涉及健康问题请咨询专业医生。</p>

      <h2 className="mt-6 font-display text-lg">七、协议变更</h2>
      <p>我们可能不时更新本协议，更新后将在应用内公告。继续使用即视为接受新版本。</p>

      <h2 className="mt-6 font-display text-lg">八、联系我们</h2>
      <p>如有疑问，请通过"我的 → 意见反馈"联系我们。</p>
    </div>
  );
}