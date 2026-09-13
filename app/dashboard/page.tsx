import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  ListTodo,
  PlayCircle,
  Timer,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { AccessLog, UrlTask } from "@/types/database";

export const metadata: Metadata = { title: "概览" };
export const dynamic = "force-dynamic";

/** 后台首页：任务统计看板 + 最近访问记录 */
export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: tasks, error: tasksError }, { data: logs }] = await Promise.all(
    [
      supabase.from("url_tasks").select("*"),
      supabase
        .from("access_logs")
        .select("*")
        .order("run_at", { ascending: false })
        .limit(10),
    ]
  );

  const taskList = (tasks ?? []) as UrlTask[];
  const logList = (logs ?? []) as AccessLog[];

  const total = taskList.length;
  const enabled = taskList.filter((t) => t.is_enabled).length;
  const successCount = logList.filter((l) => l.status === "success").length;
  const successRate =
    logList.length > 0 ? Math.round((successCount / logList.length) * 100) : null;

  // 下一次执行的任务（启用中且已排期，取最早）
  const upcoming = taskList
    .filter((t) => t.is_enabled && t.next_run_at)
    .sort((a, b) =>
      (a.next_run_at ?? "").localeCompare(b.next_run_at ?? "")
    )[0];

  const taskUrlMap = new Map(taskList.map((t) => [t.id, t.target_url]));

  const stats = [
    {
      title: "任务总数",
      value: total,
      icon: ListTodo,
      description: "全部访问任务",
    },
    {
      title: "启用中",
      value: enabled,
      icon: PlayCircle,
      description: `已禁用 ${total - enabled} 个`,
    },
    {
      title: "近期成功率",
      value: successRate === null ? "—" : `${successRate}%`,
      icon: Activity,
      description: `最近 ${logList.length} 次执行`,
    },
    {
      title: "下次执行",
      value: upcoming ? formatDateTime(upcoming.next_run_at) : "—",
      icon: Timer,
      description: upcoming ? upcoming.target_url : "暂无排期中的任务",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">概览</h1>
        <p className="text-sm text-muted-foreground">
          URL 访问任务运行状态总览
        </p>
      </div>

      {tasksError ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">数据加载失败</CardTitle>
            <CardDescription>
              {tasksError.message}
              （请确认已在 Supabase 执行建表 SQL，并正确配置 RLS 策略邮箱）
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="truncate text-2xl font-bold" title={String(stat.value)}>
                    {stat.value}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 最近访问记录 */}
          <Card>
            <CardHeader>
              <CardTitle>最近访问记录</CardTitle>
              <CardDescription>
                最新 10 条执行日志，
                <Link href="/dashboard/logs" className="underline">
                  查看全部日志
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logList.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  暂无执行记录，任务到达执行时间后将自动产生日志
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>访问时间</TableHead>
                      <TableHead>目标任务</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>响应码</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logList.map((log) => (
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
                            title={taskUrlMap.get(log.task_id) ?? ""}
                          >
                            {taskUrlMap.get(log.task_id) ?? "（任务已删除）"}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
