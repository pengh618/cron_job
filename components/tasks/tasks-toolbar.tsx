"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskFormDialog } from "./task-form-dialog";

/**
 * 任务列表工具栏：
 * URL 搜索 + 启用状态 / 策略类型筛选（URL 查询参数驱动，可刷新/分享）
 * + 新增任务入口
 */
export function TasksToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [createOpen, setCreateOpen] = useState(false);

  /** 更新查询参数并导航 */
  function apply(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `/dashboard/tasks?${query}` : "/dashboard/tasks");
  }

  const status = searchParams.get("status") ?? "all";
  const type = searchParams.get("type") ?? "all";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <form
        className="flex flex-1 items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: q.trim() || null });
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索目标 URL"
          className="w-full sm:max-w-xs"
        />
        <Button type="submit" variant="secondary" size="icon" aria-label="搜索">
          <Search />
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => apply({ status: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder="启用状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="enabled">已启用</SelectItem>
            <SelectItem value="disabled">已禁用</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={type}
          onValueChange={(v) => apply({ type: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder="策略类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部策略</SelectItem>
            <SelectItem value="cron">定时访问</SelectItem>
            <SelectItem value="random">随机访问</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          新增任务
        </Button>
      </div>

      <TaskFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
