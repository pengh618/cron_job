"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteTaskAction } from "@/lib/actions/tasks";
import type { UrlTask } from "@/types/database";

interface DeleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: UrlTask | null;
  /** 删除成功后的跳转地址（任务详情页删除后需离开当前页） */
  redirectTo?: string;
}

/** 删除任务确认弹窗（关联日志随级联删除） */
export function DeleteTaskDialog({
  open,
  onOpenChange,
  task,
  redirectTo,
}: DeleteTaskDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!task) return;
    startTransition(async () => {
      try {
        const result = await deleteTaskAction(task.id);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("任务已删除");
        onOpenChange(false);
        if (redirectTo) {
          router.replace(redirectTo);
        }
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "删除失败，请稍后重试"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>确认删除任务？</DialogTitle>
          <DialogDescription className="break-all">
            即将删除任务 <span className="font-medium">{task?.target_url}</span>
            ，其全部访问日志也会一并删除，此操作不可恢复。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 />
            )}
            {pending ? "删除中..." : "确认删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
