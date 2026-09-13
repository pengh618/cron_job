import parser from "cron-parser";

/** 调度信息（url_tasks 子集） */
export interface ScheduleInfo {
  schedule_type: "cron" | "random";
  cron_expr?: string | null;
  random_min_interval?: number | null;
  random_max_interval?: number | null;
}

/** 校验 Cron 表达式是否合法（支持 5 / 6 段） */
export function isValidCron(expr: string): boolean {
  try {
    parser.parseExpression(expr.trim());
    return true;
  } catch {
    return false;
  }
}

/** 计算指定 Cron 表达式在 from 之后的下一次执行时间 */
export function nextCronDate(expr: string, from: Date): Date | null {
  try {
    const interval = parser.parseExpression(expr.trim(), {
      currentDate: from,
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

/**
 * 计算任务下一次执行时间：
 * - cron 任务：解析 Cron 表达式得到下一次触发时间
 * - random 任务：now + [min, max] 区间内的随机分钟数
 */
export function computeNextRun(
  schedule: ScheduleInfo,
  from: Date = new Date()
): Date | null {
  if (schedule.schedule_type === "cron") {
    if (!schedule.cron_expr?.trim()) return null;
    return nextCronDate(schedule.cron_expr, from);
  }

  const rawMin = schedule.random_min_interval ?? 1;
  const rawMax = schedule.random_max_interval ?? rawMin;
  const min = Math.max(1, Math.min(rawMin, rawMax));
  const max = Math.max(min, Math.max(rawMin, rawMax));
  const delayMinutes = min + Math.random() * (max - min);
  return new Date(from.getTime() + delayMinutes * 60_000);
}
