# AI Career Plan 评测（发布前拦截）

每次发布前，用 `evals/cases/` 里的固定用例调用**真实的** `generateCareerPlan()`，记录每一次 LLM 调用，再做规则检查和 LLM 打分。**只有出现幻觉（编造内容）才会拦住发布**，其他问题只作为警告写进报告。

```bash
npm run eval                    # 跑评测并判断能否发布（退出码 0 = 可以，1 = 拦截，2 = 评测本身出错）
npm run eval -- --case <id>     # 只跑一个用例
npm run eval:selftest           # 验证评测代码本身（用本地模拟的 LLM，不需要 key）
```

本地会自动读取项目根目录的 `.env` 和 `.env.local`（和网站用的是同一套文件，都不会被提交）。没配 LLM 时只检查规则算法生成的计划，并给出警告。
报告写到 `evals/reports/latest.md`；完整 trace（每次调用的尝试过程、耗时、token，以及模型原始输出和最终计划）写到 `latest.json`。这个目录不提交到 git。

## 记录了什么（trace）

`lib/ai/llm.ts` 里的 `collectLLMCalls()` 包住一段代码，记录这段代码里每一次 `askLLM` 调用：

- 任务名、模型、总耗时
- 每次尝试的结果：`ok` / `invalid_json` / `schema_mismatch` / `schema_unsupported` / `timeout` / `rate_limited` / `api_error` …
- 最终是否退回了规则算法，以及原因
- token 用量（只在评测时向接口请求 usage）
- 模型的原始输出（`sanitizePlan` 删掉编造内容之前的版本）

**线上请求不受影响**：不在 `collectLLMCalls()` 里时，什么都不记录，请求参数也和原来完全一样。

## 规则检查

| 检查 | 看什么 |
|---|---|
| `llm_used` | 计划确实是 LLM 写的，没有因为出错、超时、格式不对而退回规则算法 |
| `attempts` | 第一次就成功（通过）/ 重试后成功（警告）/ 重试后仍失败（失败） |
| `latency` | 单次生成耗时不超过上限（默认 150 秒） |
| `cost` | token 用量 × 价格不超过预算。价格表在 `config.ts`，没填价格时只警告并显示 token 数 |
| `job_ids_valid` | 模型推荐的岗位都来自给它的岗位列表，没有编造（`sanitizePlan` 会替用户删掉编造的，但这里仍然算失败） |
| `career_ids_valid` | 替代职业同理 |
| `uses_opportunities` | 给了匹配岗位时，计划确实用上了 |
| `gap_coverage` | 核心和重要的技能差距、待提升的技能，计划覆盖了多少 |
| `ready_not_gap` | 没有把用户已经具备的技能当成差距 |
| `mentions_profile` | 计划提到了用户自己的经历或项目，不是泛泛而谈 |
| `phases_follow_roadmap` | 各阶段的时间和路线图的月份对得上，阶段数量合理 |

## 什么会拦住发布

只拦幻觉：

| 拦截 | 说明 |
|---|---|
| `job_ids_valid` / `career_ids_valid` 失败 | 模型编造了不在输入里的岗位或职业 |
| 打分的 `grounding` < 3 | 打分模型认为计划里有编造的事实（雇主、学历、项目、截止日期等） |
| 幻觉对照没通过 | 每次都会让打分模型给一份故意编造的计划（`control.ts`）打分，它必须给 ≤ 2 分；给高了说明打分模型识别不了幻觉，结果不可信 |
| 打分出错 | 没法确认有没有幻觉 |
| CI 里没配 LLM | 什么都没测到 |

其他规则检查（技能差距覆盖、是否提到本人经历、阶段月份等）和个性化 / 可行性 / 可执行性的低分，都只是警告。想让某条规则也拦截，把它加进 `config.ts` 的 `gate.blockingChecks`。

## LLM 打分

打分模型先列出计划里没有依据的"事实"（`hallucinations`），再按 4 个维度打 1–5 分：`grounding`（有依据、没编造）、`personalization`、`feasibility`、`actionability`。建议学什么、用什么工具属于建议，不算幻觉。

**默认**直接走网站自己的 `askLLM()`，和那 4 个功能用同一套变量（`DASHSCOPE_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`），不需要额外配置。

**推荐：用另一个模型打分**（比如 OpenAI），避免 kimi-k3 给自己打分偏高。设置下面两个变量就会改用独立的打分接口，网站自己的 LLM 代码完全不受影响：

| 变量 | 说明 |
|---|---|
| `EVAL_JUDGE_API_KEY` | 打分用的 key，比如你的 OpenAI key |
| `EVAL_JUDGE_MODEL` | 打分模型名（该账号下可用的聊天模型） |
| `EVAL_JUDGE_BASE_URL` | 可选，默认 `https://api.openai.com/v1`；其他 OpenAI 兼容服务改这里 |
| `EVAL_JUDGE_TEMPERATURE` | 可选，默认不发送（部分推理模型不接受这个参数） |

没配 LLM 时：本地只警告，CI 里直接拦截（GitHub Actions 会自动设置 `CI=true`）。

## 加用例

在 `cases/` 里放一个 JSON：`{ "id", "description", "context" }`，`context` 就是 `generateCareerPlan()` 的输入 `PlanContext`（格式照现有用例）。用例里的人、公司和岗位都是虚构的。

## 拦住发布

`.github/workflows/eval-gate.yml` 会在 PR 和推送到 `main` 时运行。要让它真正拦住上线：

1. GitHub 仓库 → Settings → Secrets and variables → Actions → Secrets：加 `DASHSCOPE_API_KEY` 和 `LLM_BASE_URL`，**值和 Vercel 里的一样**（GitHub Actions 读不到 Vercel 的环境变量，所以要再填一次）。改过 `LLM_MODEL` 的话，在 Variables 里也加上。用独立打分模型的话，再加 Secret `EVAL_JUDGE_API_KEY` 和 Variable `EVAL_JUDGE_MODEL`。
2. Vercel → 项目 Settings → Build and Deployment → **Deployment Checks** → Add Checks → GitHub → 选 `eval-gate`。
   之后 Vercel 仍会构建，但评测不通过时**不会把这个版本推到正式域名**。
3. （可选）GitHub 给 `main` 开分支保护，把 `eval-gate` 设为必须通过。
