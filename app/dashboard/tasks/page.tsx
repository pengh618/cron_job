import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TasksToolbar } from "@/components/tasks/tasks-toolbar";
import { TasksTable } from "@/components/tasks/tasks-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { UrlTask } from "@/types/database";

export const metadata: Metadata = { title: "任务管理" };
export const dynamic = "force-dynamic";

interface TasksPageProps {
  searchParams?: { q?: string; status?: string; type?: string };
}

/** 任务列表页：搜索 / 筛选 + 表格 */
export default async function TasksPage({ searchParams }: TasksPageProps) {
  const supabase = createClient();

  // 构建查询：URL 模糊搜索 + 启用状态 + 策略类型筛选
  let query = supabase
    .from("url_tasks")
    .select("*")
    .order("created_at", { ascending: false });

  const q = searchParams?.q?.trim();
  if (q) {
    query = query.ilike("target_url", `%${q}%`);
  }
  if (searchParams?.status === "enabled") {
    query = query.eq("is_enabled", true);
  } else if (searchParams?.status === "disabled") {
    query = query.eq("is_enabled", false);
  }
  if (searchParams?.type === "cron" || searchParams?.type === "random") {
    query = query.eq("schedule_type", searchParams.type);
  }

  const { data, error } = await query;
  const tasks = (data ?? []) as UrlTask[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">任务管理</h1>
        <p className="text-sm text-muted-foreground">
          维护定时 / 随机访问的 URL 任务，共 {tasks.length} 条
          {q ? `（搜索“${q}”）` : ""}
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>数据加载失败</AlertTitle>
          <AlertDescription>
            {error.message}
            （请确认已在 Supabase 执行建表 SQL 并正确配置 RLS 策略邮箱）
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <TasksToolbar />
          <TasksTable tasks={tasks} />
        </>
      )}
    </div>
  );
}
