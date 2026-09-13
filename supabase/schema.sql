-- =============================================================
-- URL 调度管理后台 - Supabase 建表 SQL
-- 使用方法：Supabase Dashboard → SQL Editor → 粘贴本文件全部内容并执行
--
-- 重要：执行前请将下方所有 'ADMIN_EMAIL' 替换为你的管理员邮箱，
--       且必须与环境变量 ADMIN_EMAIL 保持一致（共 8 处，可全局替换）。
-- =============================================================

-- URL 任务表
create table if not exists url_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  target_url text not null,
  is_enabled boolean default true,
  schedule_type text check (schedule_type in ('cron','random')),
  cron_expr text null,
  random_min_interval int null,
  random_max_interval int null,
  auth_config jsonb null, -- 存储目标网站登录鉴权配置 json
  last_run_at timestamptz null,
  next_run_at timestamptz null
);

-- 访问日志表
create table if not exists access_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references url_tasks(id) on delete cascade,
  run_at timestamptz default now(),
  status text, -- success / failed
  response_code int null,
  message text null
);

-- 索引：加速调度扫描与日志查询
create index if not exists idx_url_tasks_enabled_next_run
  on url_tasks(is_enabled, next_run_at);
create index if not exists idx_access_logs_task_run
  on access_logs(task_id, run_at desc);
create index if not exists idx_access_logs_run_at
  on access_logs(run_at desc);

-- =============================================================
-- RLS 行级安全策略：仅管理员（ADMIN_EMAIL 指定邮箱）可读可写
-- 注意：调度接口使用 Service Role Key，自动绕过 RLS
-- =============================================================

alter table url_tasks enable row level security;
alter table access_logs enable row level security;

-- url_tasks：查 / 增 / 改 / 删
create policy "admin_select_url_tasks"
  on url_tasks for select
  to authenticated
  using (lower(auth.jwt() ->> 'email') = lower('pdz300@163.com'));

create policy "admin_insert_url_tasks"
  on url_tasks for insert
  to authenticated
  with check (lower(auth.jwt() ->> 'email') = lower('pdz300@163.com'));

create policy "admin_update_url_tasks"
  on url_tasks for update
  to authenticated
  using (lower(auth.jwt() ->> 'email') = lower('pdz300@163.com'))
  with check (lower(auth.jwt() ->> 'email') = lower('pdz300@163.com'));

create policy "admin_delete_url_tasks"
  on url_tasks for delete
  to authenticated
  using (lower(auth.jwt() ->> 'email') = lower('pdz300@163.com'));

-- access_logs：查 / 增 / 改 / 删
create policy "admin_select_access_logs"
  on access_logs for select
  to authenticated
  using (lower(auth.jwt() ->> 'email') = lower('pdz300@163.com'));

create policy "admin_insert_access_logs"
  on access_logs for insert
  to authenticated
  with check (lower(auth.jwt() ->> 'email') = lower('pdz300@163.com'));

create policy "admin_update_access_logs"
  on access_logs for update
  to authenticated
  using (lower(auth.jwt() ->> 'email') = lower('pdz300@163.com'))
  with check (lower(auth.jwt() ->> 'email') = lower('pdz300@163.com'));

create policy "admin_delete_access_logs"
  on access_logs for delete
  to authenticated
  using (lower(auth.jwt() ->> 'email') = lower('pdz300@163.com'));
