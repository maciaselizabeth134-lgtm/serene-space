# 上架补全计划

考虑工作量，分两批做。**本次先做 P0 合规必备 + 几个高价值 P1**，确保能过审且体验完整；剩余的留作下一批。

---

## 本次实施范围

### 一、合规必备（P0）

1. **用户协议 & 隐私政策**
   - 新增路由 `/terms`、`/privacy`，写入针对自律 App 的中文条款（数据收集范围、第三方、未成年人、联系方式等）
   - 注册/登录页加勾选框"我已阅读并同意《用户协议》《隐私政策》"，未勾选禁用提交
   - 首次启动弹窗（localStorage 记录）告知隐私政策，点击同意后才进入 App

2. **账号注销**
   - "我的"页底部加入口（红色文字，二次确认 Dialog）
   - 新增 server function `deleteAccount`：用 `supabaseAdmin` 级联删除该用户的 checkins / posts / comments / likes / confessions / feedback / pet_state / user_pets / pet_rewards / profiles / avatars 存储 / auth.users
   - 注销后自动登出并跳首页

3. **内容举报**
   - 新建表 `reports(id, reporter_id, target_type, target_id, reason, detail, status, created_at)` + RLS（用户可 insert 自己的；select 仅自己的）
   - 在帖子卡片、评论、忏悔右上角加 "⋯" 菜单 → 举报弹窗（分类：垃圾广告 / 涉黄 / 涉政 / 人身攻击 / 虚假信息 / 其他 + 描述）

4. **屏蔽用户**
   - 新建表 `user_blocks(blocker_id, blocked_id, created_at)` + RLS
   - 帖子/评论右上角菜单加"屏蔽该用户"
   - 社区列表 / 评论列表查询时过滤掉被屏蔽用户的内容（前端 client 端过滤已加载数据）

5. **内容安全审核**
   - 新建 server function `moderateText`：调用 Lovable AI（`google/gemini-2.5-flash-lite`）做敏感内容判定，返回 `{ok, reason}`
   - 在发帖、评论、忏悔、反馈、修改昵称/简介前先调用，未通过则 toast 提示并阻止提交

6. **未成年保护提示**
   - 注册页加年龄确认勾选"我已年满 18 岁"
   - 戒烟/戒酒社区进入时加一次性提示横幅

### 二、主流实用功能（精选 P1）

7. **消息中心**
   - 新建表 `notifications(id, user_id, type, actor_id, target_type, target_id, content, read, created_at)` + RLS（仅自己 select/update）
   - 数据库触发器：评论别人的帖子、点赞别人的帖子时自动写入通知给作者
   - 新路由 `/notifications`，AppShell 顶部铃铛图标 + 未读红点
   - 类型：评论我、点赞我、系统公告

8. **公开个人主页**
   - 新路由 `/u/$userId`：显示头像、昵称、简介、自律天数、宠物、TA 的帖子列表
   - 帖子卡片、评论作者头像/昵称改为可点击跳转

9. **关于我们 / 版本号**
   - 新路由 `/about-app`，"我的"页折叠面板入口
   - 显示 App 介绍、版本号 v1.0.0、ICP 占位、联系邮箱

10. **意见反馈状态**
    - feedback 表加 `reply text, status text, replied_at`（schema migration）
    - 反馈区下方新增"我的反馈"列表，显示提交内容 + 回复（若有）

---

## 技术细节

**新增数据库迁移：**
```text
- create table reports (...) + RLS
- create table user_blocks (...) + RLS
- create table notifications (...) + RLS
- alter table feedback add reply, status, replied_at
- create function notify_on_comment() / notify_on_like() + triggers
- create function delete_user_cascade(uuid) security definer（供 server fn 调用）
```

**新增 server functions（src/server/）：**
- `moderation.functions.ts` → `moderateText(text)` 用 LOVABLE_API_KEY 调 AI Gateway
- `account.functions.ts` → `deleteAccount()` 用 supabaseAdmin 级联删

**新增/修改文件：**
```text
src/routes/terms.tsx              新
src/routes/privacy.tsx            新
src/routes/about-app.tsx          新
src/routes/notifications.tsx      新
src/routes/u.$userId.tsx          新
src/routes/auth.tsx               改：加协议勾选、年龄确认
src/routes/profile.tsx            改：注销入口、关于入口、我的反馈列表
src/routes/community.tsx          改：举报/屏蔽菜单、屏蔽过滤、作者跳主页
src/routes/confessions.tsx        改：举报、内容审核
src/routes/checkin.tsx            改：戒烟/戒酒分类提示
src/components/layout/AppShell.tsx 改：顶部铃铛+未读红点
src/components/ReportDialog.tsx   新
src/components/PrivacyGate.tsx    新（首次启动弹窗）
src/server/moderation.functions.ts 新
src/server/account.functions.ts   新
```

---

## 留作下一批（不在本次范围）

- 关注/粉丝系统、成就勋章、打卡日历、分享海报、搜索、每日提醒推送、客服

确认后我开始动手。


---

## 第二批已完成

- 关注/粉丝(follows 表 + 通知触发器)、关注按钮、关注/粉丝列表页 `/u/$userId/follows`
- 数据统计 `/stats`：累计/连续/近30天 + 12周热力 + 分类条形图
- 成就勋章 `/achievements`：9 级里程碑勋章 + Canvas 分享海报
- 搜索 `/search`：帖子标题内容 + 用户昵称简介
- 每日打卡提醒 `DailyReminder`：未打卡时弹悬浮条
- AppShell 顶部加搜索按钮；通知支持 follow 类型；公开主页加关注/粉丝数与分享
