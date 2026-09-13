"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskOption {
  id: string;
  target_url: string;
}

/** 日志筛选器：按任务 / 执行状态筛选（URL 查询参数驱动） */
export function LogsFilters({ tasks }: { tasks: TaskOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const task = searchParams.get("task") ?? "all";
  const status = searchParams.get("status") ?? "all";

  function apply(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all") params.delete(key);
      else params.set(key, value);
    }
    // 切换筛选时回到第一页
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/dashboard/logs?${query}` : "/dashboard/logs");
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        value={task}
        onValueChange={(v) => apply({ task: v === "all" ? null : v })}
      >
        <SelectTrigger className="w-full sm:w-[280px]">
          <SelectValue placeholder="按任务筛选" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部任务</SelectItem>
          {tasks.map((t) => (
            <SelectItem key={t.id} value={t.id} className="max-w-[280px]">
              <span className="truncate">{t.target_url}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status}
        onValueChange={(v) => apply({ status: v === "all" ? null : v })}
      >
        <SelectTrigger className="w-full sm:w-32">
          <SelectValue placeholder="执行状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          <SelectItem value="success">成功</SelectItem>
          <SelectItem value="failed">失败</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
