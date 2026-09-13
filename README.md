# URL 定时 / 随机访问调度管理后台

基于 **Next.js 14 (App Router) + Shadcn UI + Supabase + Vercel** 的 URL 访问调度管理系统。

管理员登录后维护待访问 URL 列表，可为每个 URL 配置「定时访问（Cron 表达式）」或「随机间隔访问」；若目标站点需要登录鉴权，可配置表单登录参数，调度执行时自动完成登录并携带 Cookie 访问目标页面。

## 功能特性

- **认证与权限**：Supabase 邮箱登录；仅 `ADMIN_EMAIL` 指定的管理员可访问后台，未登录跳转登录页、非管理员返回 403
- **任务管理**：新增 / 编辑 / 删除 / 启停任务；支持按 URL 搜索、按启用状态与策略类型筛选
- **调度策略**：
  - 定时访问：标准 5 段 Cron 表达式（分 时 日 月 周）
  - 随机访问：在 [最小间隔, 最大间隔]（分钟）区间内随机触发
- **目标站点鉴权**：表单登录（登录页地址 / 账号密码输入框选择器 / 账号密码 / 提交按钮选择器）+ 自定义请求头（多条 key-value）
- **访问日志**：记录每次执行的 成功 / 失败、HTTP 响应码、错误信息；支持按任务、状态筛选与分页
- **安全**：RLS 行级安全策略 + Server Action 管理员前置校验 + `/api/scheduler` 密钥保护；密钥、邮箱全部读取环境变量
- **UI**：Shadcn UI 全套组件（表格 / 表单 / 弹窗 / toast / 开关 / 下拉选择 / 卡片），支持明暗主题切换与响应式布局

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 全栈框架 | Next.js 14 (App Router) + TypeScript + Server Components / Server Actions |
| UI | Shadcn UI + Tailwind CSS + next-themes + sonner |
| 数据库 / 认证 | Supabase（PostgreSQL + Supabase Auth + RLS） |
| 调度 | Vercel Cron Jobs → `/api/scheduler` |
| 依赖 | cron-parser（Cron 表达式解析）、zod（表单校验） |

## 项目结构

```
app/
├── login/                 # 登录页
├── dashboard/             # 后台（管理员权限）
│   ├── page.tsx           # 概览统计看板
│   ├── tasks/             # 任务列表 + 新增/编辑弹窗
│   │   └── [id]/          # 单任务详情 + 该任务日志
│   └── logs/              # 全局访问日志（筛选 + 分页）
├── api/scheduler/         # Vercel Cron 调用的调度接口（CRON_SECRET 保护）
components/
├── ui/                    # Shadcn UI 组件
├── tasks/                 # 任务表单弹窗 / 列表表格 / 删除确认等
└── logs/                  # 日志筛选器
lib/
├── supabase/              # server / middleware / admin(service role) 客户端
├── scheduler/             # 调度计算、鉴权登录执行器、调度主流程
├── actions/               # Server Actions（登录 / 任务 CRUD）
└── auth.ts                # requireAdmin 管理员校验
supabase/schema.sql        # 建表 + RLS 策略 SQL
```

## 部署步骤

### 1. 创建 Supabase 项目

1. 前往 [supabase.com](https://supabase.com) 注册并创建新项目
2. 记下数据库区域与连接信息（本项目仅使用 API，无需直连数据库）

### 2. 执行建表 SQL

1. 打开 Supabase Dashboard → **SQL Editor**
2. **先全局替换** `supabase/schema.sql` 中的 `admin@example.com` 为你的管理员邮箱（共 8 处）
3. 粘贴全部内容并执行，将创建 `url_tasks`、`access_logs` 两张表及 RLS 策略

### 3. 创建管理员账号

1. Supabase Dashboard → **Authentication → Users → Add user**
2. 填入管理员邮箱与密码（勾选自动确认邮箱 Auto Confirm User，或自行完成邮箱验证）
3. 该邮箱必须与后续 `ADMIN_EMAIL` 环境变量一致

### 4. 获取 API 密钥

Supabase Dashboard → **Project Settings → API**，复制：

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY`（仅服务端使用，严禁泄露）

### 5. 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入上述配置

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 即可登录后台。

手动触发一次调度（验证调度链路）：

```bash
curl -H "Authorization: Bearer <你的CRON_SECRET>" http://localhost:3000/api/scheduler
```

### 6. 部署到 Vercel

1. 将代码推送到 GitHub 仓库
2. Vercel → **Add New Project** → 导入仓库（`vercel.json` 已附带 Cron 配置）
3. 在 **Settings → Environment Variables** 配置与 `.env.local` 一一对应的 5 个变量：

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（服务端专用） |
| `ADMIN_EMAIL` | 唯一管理员邮箱 |
| `CRON_SECRET` | 调度接口密钥（随机长字符串） |

4. 部署完成后使用管理员账号登录后台，添加第一个任务

### 7. Vercel Cron 调度配置

`vercel.json` 已配置每分钟调用一次 `/api/scheduler`：

```json
{
  "crons": [{ "path": "/api/scheduler", "schedule": "* * * * *" }]
}
```

Vercel Cron 会自动在请求头携带 `Authorization: Bearer ${CRON_SECRET}`，与调度接口的密钥校验闭环。

> **计划限制提示**：
> - **Hobby（免费）计划**：Cron 触发频率仅支持每天一次，分钟级调度需 **Pro 计划**
> - Hobby 替代方案：使用外部定时服务（如 [cron-job.org](https://cron-job.org)、GitHub Actions schedule）每分钟 GET
>   `https://<你的域名>/api/scheduler`，并携带请求头 `Authorization: Bearer <CRON_SECRET>`

## 调度执行逻辑

`/api/scheduler`（每轮触发时）：

1. 校验 `CRON_SECRET`（未配置密钥时一律拒绝）
2. 查询所有 **启用** 任务
3. `next_run_at` 缺失的任务先补算下次执行时间（本轮不执行）
4. 到达 `next_run_at` 的任务：若配置了登录参数，先 POST 表单登录目标站点获取 Cookie，再携带 Cookie 与自定义请求头访问目标 URL（单请求超时 10 秒）
5. 写入 `access_logs`（状态 / 响应码 / 错误信息），更新任务 `last_run_at` 与 `next_run_at`（Cron 按表达式推进；随机任务取新区间随机值）
6. 单轮执行预算 50 秒，超时剩余任务顺延至下一轮，适配 Vercel 函数时限

## 常见问题

- **登录后提示无权访问**：确认登录邮箱与 `ADMIN_EMAIL`、Supabase RLS 策略中的邮箱三者一致
- **任务列表加载失败**：确认已执行 `supabase/schema.sql` 且替换了策略中的管理员邮箱
- **任务从不执行**：Vercel Hobby 计划不支持分钟级 Cron，参见上文替代方案；也可用 curl 手动触发验证
- **目标站点登录失败**：HTTP 表单登录适用于标准表单站点；依赖 JS 渲染 / 验证码 / 动态 CSRF 的站点暂不支持，可在 `lib/scheduler/executor.ts` 中扩展 Playwright 方案（注意 Vercel 函数超时与体积限制）

## 安全说明

- 所有密钥、邮箱均通过环境变量注入，代码零硬编码
- `service_role` 密钥仅在服务端调度接口使用，不进入客户端 bundle
- 后台页面（middleware + layout）、Server Actions（`requireAdmin`）、数据层（RLS）三重管理员校验
- 鉴权配置中的目标站点密码明文存储于 `auth_config`（调度需要），受 RLS 保护，请确保 Supabase 项目安全
