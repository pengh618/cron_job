import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LogsFilters } from "@/components/logs/logs-filters";
import { formatDateTime } from "@/lib/format";
import type { AccessLogWithTask, UrlTask } from "@/types/database";

export const metadata: Metadata = { title: "访问日志" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface LogsPageProps {
  searchParams?: { task?: string; status?: string; page?: string };
}

/** 全局访问日志页：按任务 / 状态筛选 + 分页 */
export default async function LogsPage({ searchParams }: LogsPageProps) {
  const supabase = createClient();

  const taskId = searchParams?.task;
  const status =
    searchParams?.status === "success" || searchParams?.status === "failed"
      ? searchParams.status
      : undefined;
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);

  // 数据查询与计数查询共用筛选条件
  let logsQuery = supabase
    .from("access_logs")
    .select("*, url_tasks(target_url)")
    .order("run_at", { ascending: false });
  let countQuery = supabase
    .from("access_logs")
    .select("id", { count: "exact", head: true });

  if (taskId) {
    logsQuery = logsQuery.eq("task_id", taskId);
    countQuery = countQuery.eq("task_id", taskId);
  }
  if (status) {
    logsQuery = logsQuery.eq("status", status);
    countQuery = countQuery.eq("status", status);
  }

  const [{ data: logs, error }, { count }] = await Promise.all([
    logsQuery.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    countQuery,
  ]);

  // 任务下拉选项
  const { data: tasks } = await supabase
    .from("url_tasks")
    .select("id, target_url")
    .order("created_at", { ascending: false });

  const rows = (logs ?? []) as AccessLogWithTask[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /** 保留当前筛选条件的分页链接 */
  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (taskId) params.set("task", taskId);
    if (status) params.set("status", status);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `/dashboard/logs?${query}` : "/dashboard/logs";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">访问日志</h1>
        <p className="text-sm text-muted-foreground">
          共 {total} 条记录，第 {page} / {totalPages} 页
        </p>
      </div>

      <LogsFilters tasks={(tasks ?? []) as Pick<UrlTask, "id" | "target_url">[]} />

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          日志加载失败：{error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">暂无日志记录</p>
          <p className="text-xs text-muted-foreground">
            任务被调度执行后，访问结果会记录在这里
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>访问时间</TableHead>
                <TableHead>目标任务</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>响应码</TableHead>
                <TableHead>信息</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((log) => (
                <TableRow key={log.id}>
                  <TableCell
                    className="whitespace-nowrap text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {formatDateTime(log.run_at)}
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <Link
                      href={`/dashboard/tasks/${log.task_id}`}
                      className="block truncate hover:underline"
                      title={log.url_tasks?.target_url ?? ""}
                    >
                      {log.url_tasks?.target_url ?? "（任务已删除）"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {log.status === "success" ? (
                      <Badge variant="success">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        成功
                      </Badge>
                    ) : (
                      <Badge variant="danger">
                        <XCircle className="mr-1 h-3 w-3" />
                        失败
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.response_code ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <span
                      className="block truncate text-xs text-muted-foreground"
                      title={log.message ?? ""}
                    >
                      {log.message ?? "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button asChild variant="outline" disabled={page <= 1}>
            <Link href={pageHref(page - 1)} aria-disabled={page <= 1}>
              上一页
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button asChild variant="outline" disabled={page >= totalPages}>
            <Link href={pageHref(page + 1)} aria-disabled={page >= totalPages}>
              下一页
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
