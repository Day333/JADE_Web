# Supabase 连接说明

项目 ref `fzpuofxrfqkzushfmxxx` · 区域 ap-northeast-2（首尔）· PostgreSQL 17.6

真实凭证在 `.env`（已被 `.gitignore` 排除）。本文件只记录**为什么这么连**，不含密码。

## 必须用连接池，不能用 direct connection

控制台给出的 direct connection：

```
postgresql://postgres:[PASSWORD]@db.fzpuofxrfqkzushfmxxx.supabase.co:5432/postgres
```

**这条在本机连不通。** 该主机只有 AAAA 记录（纯 IPv6），而本机没有全局 IPv6 地址、也没有 IPv6 默认路由，DNS 查得到但无路可走（`No route to host`）。

改用 Supavisor 连接池（有 IPv4）：

| 项 | 值 |
|---|---|
| 主机 | `aws-0-ap-northeast-2.pooler.supabase.com` |
| 端口 | `5432` session 模式 / `6543` transaction 模式 |
| 用户 | `postgres.fzpuofxrfqkzushfmxxx` ← **必须带项目 ref** |
| 库 | `postgres` |
| SSL | `require` |

两个易错点：

- 用户名只写 `postgres` 会失败，必须是 `postgres.<project-ref>`
- 主机前缀是 `aws-0-`，`aws-1-` 那台会报 `FATAL: (ENOTFOUND) tenant/user`

选哪个端口：迁移工具、需要事务或 prepared statement 的场景用 **5432**；serverless、短连接高并发用 **6543**。

## 密码转义

密码若含 `?` `$` `*` `#` 等特殊字符：

- **URL 里**必须百分号转义，尤其 `#` 不转义会被当成 fragment 把后面截断
- **shell 里**必须用单引号包裹，否则 `$` 后面的字符会被当变量展开、`?` `*` 会被当通配符

最省事的做法是不拼 URL，改用 `PGHOST`/`PGUSER`/`PGPASSWORD` 环境变量。

## 验证连接

```bash
# 需要 psql：brew install libpq
set -a && source .env && set +a
psql "$DATABASE_URL" -c "select version()"
```

## 当前数据库状态（2026-09-18）

全新空项目：public schema 零张表，`auth.users` 零个用户。
auth 只启用了邮箱密码登录，所有 OAuth 提供商均关闭，开放注册且要求邮箱验证。

## 环境注意事项

Claude Code 的 Bash 沙箱只放行 443 端口、且解析不了 `github.com`。因此连数据库（5432/6543）、以及 `brew install` 装 GitHub 来源的包，都需要关闭沙箱执行。沙箱内 `dig`/`curl` 能通是走了代理层，会造成网络正常的错觉。
