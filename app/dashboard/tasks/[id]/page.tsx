import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Globe,
  KeyRound,
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
import { TaskDetailActions } from "@/components/tasks/task-detail-actions";
import { formatDateTime } from "@/lib/format";
import type { AccessLog, UrlTask } from "@/types/database";

export const metadata: Metadata = { title: "任务详情" };
export const dynamic = "force-dynamic";

interface TaskDetailPageProps {
  params: { id: string };
}

/** 任务详情页：完整配置信息 + 该任务的访问日志 */
export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const supabase = createClient();

  const { data: task } = await supabase
    .from("url_tasks")
    .select("*")
    .eq("id", params.id)
    .single<UrlTask>();

  if (!task) {
    notFound();
  }

  const { data: logs } = await supabase
    .from("access_logs")
    .select("*")
    .eq("task_id", task.id)
    .order("run_at", { ascending: false })
    .limit(50);

  const auth = task.auth_config;

  return (
    <div className="space-y-6">
      <TaskDetailActions task={task} />

      <div>
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          任务详情
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4 shrink-0" />
          <span className="truncate">{task.target_url}</span>
        </p>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">启用状态</p>
            {task.is_enabled ? (
              <Badge variant="success">已启用</Badge>
            ) : (
              <Badge variant="secondary">已禁用</Badge>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">创建时间</p>
            <p className="text-sm">{formatDateTime(task.created_at)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">访问策略</p>
            {task.schedule_type === "cron" ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Timer className="mr-1 h-3 w-3" />
                  定时
                </Badge>
                <code className="text-sm">{task.cron_expr}</code>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">随机</Badge>
                <span className="text-sm">
                  {task.random_min_interval} - {task.random_max_interval} 分钟
                </span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">鉴权配置</p>
            {auth?.loginUrl ? (
              <Badge variant="success">
                <KeyRound className="mr-1 h-3 w-3" />
                已配置表单登录
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">无</span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">上次执行</p>
            <p className="text-sm">{formatDateTime(task.last_run_at)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">下次预计执行</p>
            <p className="text-sm">{formatDateTime(task.next_run_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* 鉴权配置详情（密码脱敏展示） */}
      {auth?.loginUrl ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              鉴权配置
            </CardTitle>
            <CardDescription>目标站点登录参数（密码已脱敏）</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">登录页面地址</p>
              <p className="break-all">{auth.loginUrl}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">账号</p>
              <p>{auth.username}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">密码</p>
              <p>••••••••</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">鉴权类型</p>
              <p>表单登录（预留扩展）</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">账号输入框选择器</p>
              <code className="text-xs">{auth.usernameSelector || "—"}</code>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">密码输入框选择器</p>
              <code className="text-xs">{auth.passwordSelector || "—"}</code>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">提交按钮选择器</p>
              <code className="text-xs">{auth.submitSelector || "—"}</code>
            </div>
            {auth.headers && Object.keys(auth.headers).length > 0 ? (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs text-muted-foreground">自定义请求头</p>
                <div className="rounded-md bg-muted p-3 font-mono text-xs">
                  {Object.entries(auth.headers).map(([key, value]) => (
                    <p key={key}>
                      {key}: {value}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* 访问日志 */}
      <Card>
        <CardHeader>
          <CardTitle>访问日志（最近 50 条）</CardTitle>
          <CardDescription>
            每次调度执行的访问结果，全部日志见
            <Link href="/dashboard/logs" className="ml-1 underline">
              访问日志页
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(logs ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              暂无访问记录，任务到达执行时间后将自动产生日志
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>访问时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>响应码</TableHead>
                  <TableHead>信息</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((logs ?? []) as AccessLog[]).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell
                      className="whitespace-nowrap text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {formatDateTime(log.run_at)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
