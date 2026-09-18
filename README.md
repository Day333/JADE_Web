# JADE_Web

线上地址：**https://jade-web-five.vercel.app**

基于 Next.js + Supabase 的网站，托管在 Vercel。当前是 Supabase 官方 Next.js 模板的初始状态：邮箱注册、登录、找回密码，以及一个登录后才能访问的 `/protected` 页面。

## 技术栈

| 部分 | 用的是 | 负责 |
|---|---|---|
| 前端 | Next.js（App Router）+ Tailwind + shadcn/ui | 页面与交互 |
| 后端 | Supabase | 数据库（Postgres）、用户登录 |
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

`.env.example` 里其余的 `PG*` / `DATABASE_URL` 是给 `psql`、迁移工具等直连数据库用的，网站运行不需要，也不要配到 Vercel 上。

## 部署

推送到 `main` 分支，Vercel 会自动重新部署到上面的线上地址。推送其他分支会生成一个独立的预览网址。

Vercel 项目的环境变量只配了上面两个 `NEXT_PUBLIC_` 变量。

## Supabase 登录配置

Supabase 后台 → Authentication → URL Configuration：

- **Site URL**：`https://jade-web-five.vercel.app`
- **Redirect URLs**：
  - `http://localhost:3000/**`（本地开发）
  - `https://*-jade-e2a9.vercel.app/**`（Vercel 预览部署）

注册确认邮件目前用的是 Supabase 自带的发信服务：只会发给 Supabase 组织成员的邮箱，并且每小时条数有限。对外开放注册前，需要在 Authentication → Emails 里配置自定义 SMTP。

## 目录

```
app/              页面路由（auth/ 下是登录注册相关页面）
components/       界面组件（ui/ 为 shadcn/ui 基础组件）
lib/supabase/     Supabase 客户端：浏览器端、服务端、proxy 各一个
proxy.ts          每次请求刷新登录状态，未登录访问受保护页面时跳转到登录页
```

数据库连接方式与踩过的坑见 [CONNECTION.md](CONNECTION.md)。
