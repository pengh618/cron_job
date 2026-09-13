"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, KeyRound, Loader2, Pencil, Timer, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskFormDialog } from "./task-form-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { toggleTaskAction } from "@/lib/actions/tasks";
import { formatDateTime } from "@/lib/format";
import type { UrlTask } from "@/types/database";

/** 任务列表表格：策略、启停、执行时间、操作（编辑 / 删除 / 查看日志） */
export function TasksTable({ tasks }: { tasks: UrlTask[] }) {
  const router = useRouter();
  const [editingTask, setEditingTask] = useState<UrlTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<UrlTask | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleToggle(task: UrlTask, enabled: boolean) {
    setTogglingId(task.id);
    startTransition(async () => {
      try {
        const result = await toggleTaskAction(task.id, enabled);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(enabled ? "任务已启用" : "任务已禁用");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "操作失败");
      } finally {
        setTogglingId(null);
      }
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">暂无任务</p>
        <p className="text-xs text-muted-foreground">
          点击上方「新增任务」创建第一个 URL 访问任务
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">目标 URL</TableHead>
              <TableHead>策略</TableHead>
              <TableHead>启用</TableHead>
              <TableHead>上次执行</TableHead>
              <TableHead>下次预计执行</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="max-w-[280px]">
                  <Link
                    href={`/dashboard/tasks/${task.id}`}
                    className="block truncate font-medium hover:underline"
                    title={task.target_url}
                  >
                    {task.target_url}
                  </Link>
                  {task.auth_config?.loginUrl ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <KeyRound className="h-3 w-3" />
                      已配置鉴权
                    </span>
                  ) : null}
                </TableCell>

                <TableCell>
                  {task.schedule_type === "cron" ? (
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="w-fit">
                        <Timer className="mr-1 h-3 w-3" />
                        定时
                      </Badge>
                      <code className="text-xs text-muted-foreground">
                        {task.cron_expr}
                      </code>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="w-fit">
                        随机
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {task.random_min_interval} - {task.random_max_interval} 分钟
                      </span>
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  <Switch
                    checked={task.is_enabled}
                    disabled={togglingId === task.id}
                    onCheckedChange={(checked) => handleToggle(task, checked)}
                    aria-label="启用或禁用任务"
                  />
                </TableCell>

                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(task.last_run_at)}
                </TableCell>

                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(task.next_run_at)}
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      title="查看访问日志"
                    >
                      <Link href={`/dashboard/tasks/${task.id}`}>
                        <FileText />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="编辑"
                      onClick={() => setEditingTask(task)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="删除"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingTask(task)}
                    >
                      <Trash2 />
                    </Button>
                    {togglingId === task.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 编辑弹窗 */}
      <TaskFormDialog
        open={editingTask !== null}
        onOpenChange={(open) => !open && setEditingTask(null)}
        task={editingTask}
      />

      {/* 删除确认弹窗 */}
      <DeleteTaskDialog
        open={deletingTask !== null}
        onOpenChange={(open) => !open && setDeletingTask(null)}
        task={deletingTask}
      />
    </>
  );
}
