import { createAdminClient } from "@/lib/supabase/admin";
import type { UrlTask } from "@/types/database";
import { computeNextRun } from "./cron";
import { executeTask, type VisitResult } from "./executor";

export interface SchedulerRunResult {
  /** 扫描的启用任务总数 */
  scanned: number;
  /** 本轮实际执行的任务数 */
  executed: number;
  /** 因时间预算耗尽而跳过的任务数（下一轮继续） */
  deferred: number;
  results: Array<VisitResult & { taskId: string; targetUrl: string }>;
}

/** 单轮调度最长执行 50 秒，为 Vercel 函数时限留出写库余量 */
const RUN_BUDGET_MS = 50_000;

/**
 * 调度主逻辑（由 /api/scheduler 触发）：
 * 1. 查询所有启用任务
 * 2. next_run_at 缺失的任务先补算执行时间（本轮不执行）
 * 3. 到达执行时间的任务：执行访问 → 写访问日志 → 更新 last_run_at / next_run_at
 */
export async function runScheduler(): Promise<SchedulerRunResult> {
  const supabase = createAdminClient();
  const startedAt = Date.now();

  const { data: tasks, error } = await supabase
    .from("url_tasks")
    .select("*")
    .eq("is_enabled", true);

  if (error) {
    throw new Error(`查询任务失败：${error.message}`);
  }

  const now = Date.now();
  const results: SchedulerRunResult["results"] = [];
  let executed = 0;
  let deferred = 0;

  for (const task of (tasks ?? []) as UrlTask[]) {
    const nextRunMs = task.next_run_at ? Date.parse(task.next_run_at) : NaN;

    // next_run_at 缺失或非法：补算后本轮不执行
    if (Number.isNaN(nextRunMs)) {
      const computed = computeNextRun(task, new Date(now));
      if (computed) {
        await supabase
          .from("url_tasks")
          .update({ next_run_at: computed.toISOString() })
          .eq("id", task.id);
      }
      continue;
    }

    // 未到执行时间
    if (now < nextRunMs) continue;

    // 时间预算耗尽：推迟到下一轮，避免超出 Vercel 函数时限
    if (Date.now() - startedAt > RUN_BUDGET_MS) {
      deferred++;
      continue;
    }

    // 执行访问
    const visit = await executeTask(task);
    executed++;
    const finishedAt = new Date();
    const nextRun = computeNextRun(task, finishedAt);

    // 写入访问日志（失败不影响后续任务）
    const { error: logError } = await supabase.from("access_logs").insert({
      task_id: task.id,
      run_at: finishedAt.toISOString(),
      status: visit.status,
      response_code: visit.responseCode,
      message: visit.message ? visit.message.slice(0, 2000) : null,
    });

    // 更新任务执行状态
    const { error: updateError } = await supabase
      .from("url_tasks")
      .update({
        last_run_at: finishedAt.toISOString(),
        next_run_at: nextRun ? nextRun.toISOString() : null,
      })
      .eq("id", task.id);

    results.push({
      taskId: task.id,
      targetUrl: task.target_url,
      ...visit,
      ...(logError || updateError
        ? {
            message: [
              visit.message,
              logError ? `日志写入失败：${logError.message}` : null,
              updateError ? `任务更新失败：${updateError.message}` : null,
            ]
              .filter(Boolean)
              .join("；"),
          }
        : {}),
    });
  }

  return {
    scanned: tasks?.length ?? 0,
    executed,
    deferred,
    results,
  };
}
