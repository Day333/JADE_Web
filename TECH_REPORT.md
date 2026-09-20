# Career Lighthouse 技术报告

> 线上地址：https://jade-web-five.vercel.app ·
> 代码仓库：https://github.com/Day333/JADE_Web

Career Lighthouse 是一个面向学生求职者的 AI 职业平台：上传简历自动生成职业档案，
推荐匹配的职业方向和岗位，生成个性化的职业规划，并提供投递追踪、面试题库、
成长徽章和求职社区等功能。本报告简要说明它的技术选型与整体架构。

## 一、总体架构

```
浏览器
  │
  ▼
Vercel（托管 + CDN + Serverless 运行时）
  └── Next.js 16 应用（App Router，前后端一体）
        │                          │
        ▼                          ▼
Supabase（数据层）           DashScope（AI 能力）
  ├─ Postgres 17 数据库        └─ GPT5.6 大模型
  ├─ Auth 用户认证                 （OpenAI 兼容接口）
  ├─ Storage 文件存储
  └─ Realtime 实时推送
```

一句话概括：**前端和服务端逻辑都写在 Next.js 里、部署在 Vercel 上；所有数据放在
Supabase 的 Postgres 数据库中；AI 功能通过 DashScope 的大模型接口实现。**

## 二、前端

| 技术 | 用途 |
| --- | --- |
| Next.js 16（App Router + Turbopack） | 核心框架，页面以 React Server Components 为主，服务端直接查库渲染 |
| React 19 | UI 框架 |
| Tailwind CSS 3 + shadcn/ui（Radix UI） | 样式与组件库，支持深色模式（next-themes） |
| lucide-react | 图标 |
| sonner | 全局轻提示（toast） |

大部分页面是服务端组件：在服务器上完成鉴权、查库、计算（如岗位匹配打分），
把渲染好的 HTML 发给浏览器；只有需要交互的部分（表单、聊天窗、题库打勾等）
是客户端组件。数据写入统一走 Next.js Server Actions。

## 三、数据库与后端（Supabase）

- **Postgres 17**：约 30 张业务表，覆盖用户档案、技能、简历、岗位、投递、
  私信、社区帖子、面试题库、成就徽章等。所有表结构变更通过
  `supabase/migrations/` 下的 16 个迁移文件管理，可完整重建。
- **行级安全（RLS）**：每张表都开启了 Row Level Security，
  "谁能看到哪行数据"由数据库策略强制执行（例如练习记录只有本人可读，
  职业档案的可见性由 `can_view_profile()` 函数统一裁决），
  即使前端代码有漏洞也不会越权读到数据。
- **数据库函数（RPC）**：敏感逻辑放在 security definer 函数里执行，
  例如 `refresh_achievements()` 只根据真实行为数据发放徽章（用户无法给自己刷徽章）、
  `public_activity()` 只向访客暴露"每天活动总数"而不暴露投递明细。
- **Auth**：Supabase 自带的邮箱密码认证，配合 `@supabase/ssr`
  在服务端组件、Server Actions 和中间件中共享登录态。
- **Storage**：`resumes` 存储桶保存用户上传的简历原件，访问权限同样由策略控制。
- **Realtime**：私信聊天和通知角标使用 Supabase Realtime 订阅数据库变更，
  无需轮询即可实时更新。

## 四、AI 能力

模型通过 **DashScope 的 OpenAI 兼容接口**调用（`openai` SDK + 自定义 base URL），
当前使用 **GPT5.6**。封装在 `lib/ai/llm.ts`，有两个工程细节：

1. **结构化输出**：要求模型按 JSON Schema 返回；当接口的约束解码出错时
   自动降级为普通 JSON 模式并把 Schema 写进提示词重试，配合 zod 校验兜底。
2. **可追踪**：每次调用都记录模型、耗时和结果，便于排查。

AI 参与的功能：

- **简历解析**：上传 PDF/Word（unpdf、mammoth 提取文本）后，由大模型抽取
  教育、经历、项目、技能，生成职业档案草稿，用户确认后入库。
- **AI 职业规划**：结合用户档案、目标职业、技能差距和在库岗位，生成带重点标注的
  行动计划；完整版由 pdfkit 排版成 PDF 供 Pro 用户下载。
- **职业/岗位匹配打分**：这是**规则算法而非大模型**——按技能覆盖度、偏好、
  目标职业等加权计算，速度快、可解释、结果稳定。

## 五、部署与持续集成

- **Vercel（Hobby 计划）**：连接 GitHub 仓库，推送到 main 即自动构建部署；
  Serverless 函数运行所有服务端逻辑，环境变量（Supabase 密钥、DashScope Key）
  保存在 Vercel 控制台，不进代码库。
- **GitHub Actions 质量门禁（eval-gate）**：每次推送自动运行 AI 输出评测——
  用固定测试用例让模型生成职业计划，再由规则检查 + LLM 评审打分，
  出现"编造不存在的岗位/技能"这类幻觉问题会直接拦下这次发布。

## 六、质量保障

- TypeScript 全量类型检查 + ESLint。
- 数据库类型定义由 Supabase 自动生成（`lib/database.types.ts`），
  查库语句在编译期就能发现字段错误。
- 用 Playwright 驱动真实浏览器做端到端验证（注册、上传简历、投递、
  发帖、徽章等全流程），关键改动在本地和生产环境各跑一遍。
- 评测体系自带 21 个自测用例，保证"检查器本身"不出错。