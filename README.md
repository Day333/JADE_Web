# JADE_Web

线上地址：**https://jade-web-five.vercel.app**

JADE 是面向大学生、毕业生和职业早期用户的 AI 职业成长、职业社区与招聘平台（网站界面为英文）。围绕用户的 Career Profile，覆盖完整流程：

**职业认知 → 职业发现 → 职业规划 → 能力提升 → 社区交流 → 岗位发现 → 招聘沟通 → 简历投递 → 求职进度管理**

## 功能地图

| 模块 | 页面 | 说明 |
|---|---|---|
| 账号 | `/auth/login`、`/auth/sign-up` | 邮箱注册登录 |
| 新用户引导 | `/onboarding` → `resume` → `review` → `preferences` → `complete` | 选择身份、上传简历、确认解析结果、职业偏好问卷、生成 Career Profile |
| 首页 | `/dashboard` | 职业画像摘要、当前目标与下一步、推荐岗位、社区内容 |
| 职业档案 | `/profile`、`/settings` | 完整 Career Profile 编辑；隐私与可见性 |
| 职业规划 | `/careers`、`/careers/[id]`、`/skill-gap`、`/roadmap` | 职业推荐、隐藏职业潜力、职业详情、技能差距、分阶段路线图、Career Readiness |
| 社区 | `/community`、`/community/c/[slug]`、`/community/post/[id]`、`/journey`、`/u/[id]` | 职业/公司/大学社区、帖子、Career Journey、公开主页、关注 |
| 私信 | `/messages` | 用户私信与招聘者聊天（实时） |
| 求职 | `/jobs`、`/jobs/[id]`、`/jobs/[id]/apply`、`/applications` | 个性化岗位推荐、匹配度、投递确认、申请追踪 |
| 招聘者 | `/employer`、`/employer/jobs/new`、`/employer/jobs/[id]/candidates`、`/employer/candidates/[id]`、`/employer/discover` | 发布岗位、候选人管理、技能证据、主动发现人才、邀请投递/面试 |
| 其他 | `/notifications`、`/search` | 通知中心、全局搜索 |

## AI 功能与 LLM 接入

需要 LLM 的功能（简历解析、职业推荐、隐藏职业潜力、技能差距、路线图、岗位匹配）目前**全部用规则算法实现**，LLM 接口先空着：

- `lib/ai/llm.ts`：唯一的 LLM 调用入口 `askLLM()`，目前直接返回 `null`（未接入任何模型）。
- `lib/ai/index.ts`：各功能先调用 `askLLM()`，拿不到结果就回退到规则算法。
- 规则算法：`resume-parser.ts`（简历解析）、`matching.ts`（职业/岗位匹配、隐藏潜力、技能差距、就绪度）、`roadmap.ts`（路线图）、`questionnaire.ts`（偏好问卷）。

以后接入模型：在 `.env` 和 Vercel 里加 `LLM_API_KEY`，在 `askLLM()` 里实现请求并返回解析好的 JSON 即可，页面代码不用改。

## 技术栈

| 部分 | 用的是 | 负责 |
|---|---|---|
| 前端 | Next.js 16（App Router）+ Tailwind + shadcn/ui | 页面与交互 |
| 后端 | Supabase | Postgres 数据库（全部表启用 RLS）、登录、简历文件存储、实时消息 |
| 托管 | Vercel | 推送到 `main` 后自动构建部署 |

## 本地开发

需要 Node.js 20 以上。

```bash
npm install
cp .env.example .env   # 然后填入真实值，取值位置见文件内注释
npm run dev            # 打开 http://localhost:3000
```

网站本身只用到两个环境变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

`.env.example` 里其余的 `PG*` / `DATABASE_URL` 是给迁移工具等直连数据库用的，网站运行不需要，也不要配到 Vercel 上。

## 数据库

表结构、权限规则（RLS）、触发器和示例数据都在 `supabase/migrations/`，按文件名顺序执行：

| 文件 | 内容 |
|---|---|
| `…120000_core_schema.sql` | 全部表、RLS、RPC 函数、自动生成通知的触发器、简历存储桶 |
| `…120100_seed_reference_data.sql` | 技能库、职业库、虚构示例公司、社区、示例岗位 |
| `…120200_function_grants.sql` | 函数执行权限收紧 |
| `…120300_notifications_self_insert.sql` | 允许用户给自己创建通知 |

示例公司和岗位（`is_sample = true`）都是虚构的，没有真实招聘者，所以不能和它们聊天。改了表结构后重新生成类型：用 Supabase MCP 的 `generate_typescript_types`，结果保存到 `lib/database.types.ts`。

## 部署

推送到 `main` 分支，Vercel 会自动重新部署到上面的线上地址。推送其他分支会生成一个独立的预览网址。

Vercel 项目的环境变量只配了上面两个 `NEXT_PUBLIC_` 变量。

## Supabase 登录配置

Supabase 后台 → Authentication → URL Configuration：

- **Site URL**：`https://jade-web-five.vercel.app`
- **Redirect URLs**：
  - `http://localhost:3000/**`（本地开发）
  - `https://*-jade-e2a9.vercel.app/**`（Vercel 预览部署）

目前**关闭了邮箱确认**（Authentication → Sign In / Providers → Confirm email），任何邮箱注册后直接登录。原因是 Supabase 自带的发信服务只会发给组织成员的邮箱，并且每小时条数有限。

对外正式开放前：在 Authentication → Emails 里配置自定义 SMTP（例如 Resend，需要自己的域名），然后重新打开 Confirm email。注册页代码两种模式都支持，不用改。在那之前，"忘记密码"邮件也只能发给组织成员。

## 目录

```
app/(app)/          登录后的页面（共享顶部导航）
app/auth/           登录注册相关页面
app/page.tsx        落地页
components/app/     跨页面共享组件（导航、匹配度徽章、技能标签、就绪度圆环等）
components/ui/      shadcn/ui 基础组件
lib/ai/             AI 功能（LLM 入口 + 规则算法）
lib/data/           数据读取（职业库、个人档案、岗位）
lib/actions/        服务端操作（Server Actions）
lib/auth.ts         登录状态与角色检查
supabase/migrations 数据库迁移
proxy.ts            每次请求刷新登录状态，未登录访问受保护页面时跳转到登录页
```

数据库连接方式与踩过的坑见 [CONNECTION.md](CONNECTION.md)。
