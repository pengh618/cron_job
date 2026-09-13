"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TaskFormDialog } from "./task-form-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import type { UrlTask } from "@/types/database";

/** 任务详情页操作区：返回 / 编辑 / 删除 */
export function TaskDetailActions({ task }: { task: UrlTask }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft />
        返回
      </Button>
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <Pencil />
        编辑任务
      </Button>
      <Button
        variant="destructive"
        onClick={() => setDeleteOpen(true)}
        className="ml-auto"
      >
        <Trash2 />
        删除任务
      </Button>

      <TaskFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
      />
      <DeleteTaskDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        task={task}
        redirectTo="/dashboard/tasks"
      />
    </div>
  );
}
