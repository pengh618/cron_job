"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeNextRun, isValidCron } from "@/lib/scheduler/cron";
import type { TaskInput } from "@/types/task";
import type { UrlTask } from "@/types/database";

export interface TaskActionResult {
  error?: string;
}

/** 任务表单校验 Schema */
const taskInputSchema = z
  .object({
    targetUrl: z.string().trim().min(1, "请填写目标 URL").url("目标 URL 格式不正确"),
    isEnabled: z.boolean(),
    scheduleType: z.enum(["cron", "random"]),
    cronExpr: z.string().optional(),
    randomMinInterval: z
      .number()
      .int("间隔必须为整数分钟")
      .min(1, "最小间隔至少 1 分钟")
      .max(525600, "间隔过大")
      .optional(),
    randomMaxInterval: z
      .number()
      .int("间隔必须为整数分钟")
      .min(1, "最大间隔至少 1 分钟")
      .max(525600, "间隔过大")
      .optional(),
    authConfig: z
      .object({
        type: z.literal("form").optional(),
        loginUrl: z.string().trim().url("登录页面地址格式不正确"),
        usernameSelector: z.string().optional(),
        passwordSelector: z.string().optional(),
        username: z.string().trim().min(1, "请填写登录账号"),
        password: z.string().min(1, "请填写登录密码"),
        submitSelector: z.string().optional(),
        headers: z.record(z.string()).optional(),
      })
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.scheduleType === "cron") {
      const expr = data.cronExpr?.trim() ?? "";
      if (!expr) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cronExpr"],
          message: "请填写 Cron 表达式",
        });
      } else if (!isValidCron(expr)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cronExpr"],
          message: "Cron 表达式格式不正确（示例：*/5 * * * *）",
        });
      }
    }
    if (data.scheduleType === "random") {
      if (data.randomMinInterval == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["randomMinInterval"],
          message: "请填写最小间隔",
        });
      }
      if (data.randomMaxInterval == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["randomMaxInterval"],
          message: "请填写最大间隔",
        });
      }
      if (
        data.randomMinInterval != null &&
        data.randomMaxInterval != null &&
        data.randomMaxInterval < data.randomMinInterval
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["randomMaxInterval"],
          message: "最大间隔不能小于最小间隔",
        });
      }
    }
  });

type TaskInputParsed = z.infer<typeof taskInputSchema>;

/** 校验并转换为数据库行结构（同时计算 next_run_at） */
function toRow(data: TaskInputParsed) {
  const now = new Date();
  const nextRun = computeNextRun(
    {
      schedule_type: data.scheduleType,
      cron_expr: data.cronExpr,
      random_min_interval: data.randomMinInterval,
      random_max_interval: data.randomMaxInterval,
    },
    now
  );

  const authConfig = data.authConfig
    ? {
        type: "form" as const,
        loginUrl: data.authConfig.loginUrl,
        usernameSelector: data.authConfig.usernameSelector?.trim() || null,
        passwordSelector: data.authConfig.passwordSelector?.trim() || null,
        username: data.authConfig.username,
        password: data.authConfig.password,
        submitSelector: data.authConfig.submitSelector?.trim() || null,
        headers:
          data.authConfig.headers && Object.keys(data.authConfig.headers).length
            ? data.authConfig.headers
            : null,
      }
    : null;

  return {
    target_url: data.targetUrl,
    is_enabled: data.isEnabled,
    schedule_type: data.scheduleType,
    cron_expr: data.scheduleType === "cron" ? data.cronExpr!.trim() : null,
    random_min_interval:
      data.scheduleType === "random" ? data.randomMinInterval! : null,
    random_max_interval:
      data.scheduleType === "random" ? data.randomMaxInterval! : null,
    auth_config: authConfig,
    // 创建/修改后重置调度：禁用任务不排期，启用任务立即排下次执行时间
    next_run_at: data.isEnabled ? nextRun?.toISOString() ?? null : null,
  };
}

/** 新增任务 */
export async function createTaskAction(
  input: TaskInput
): Promise<TaskActionResult> {
  await requireAdmin(); // 未登录跳转 /login，非管理员抛错

  try {
    const parsed = taskInputSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "表单参数错误" };
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("url_tasks")
      .insert(toRow(parsed.data));

    if (error) {
      return { error: `创建任务失败：${error.message}` };
    }

    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "创建任务失败，请稍后重试",
    };
  }
}

/** 编辑任务 */
export async function updateTaskAction(
  id: string,
  input: TaskInput
): Promise<TaskActionResult> {
  await requireAdmin();

  try {
    const parsed = taskInputSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "表单参数错误" };
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("url_tasks")
      .update(toRow(parsed.data))
      .eq("id", id);

    if (error) {
      return { error: `更新任务失败：${error.message}` };
    }

    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard/tasks/" + id);
    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "更新任务失败，请稍后重试",
    };
  }
}

/** 删除任务（日志随外键级联删除） */
export async function deleteTaskAction(
  id: string
): Promise<TaskActionResult> {
  await requireAdmin();

  try {
    const supabase = createClient();
    const { error } = await supabase.from("url_tasks").delete().eq("id", id);
    if (error) {
      return { error: `删除任务失败：${error.message}` };
    }

    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard/logs");
    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "删除任务失败，请稍后重试",
    };
  }
}

/**
 * 启用 / 禁用任务：
 * - 启用时从当前时间重新计算 next_run_at，避免旧的过期时间立即触发
 * - 禁用时清空 next_run_at
 */
export async function toggleTaskAction(
  id: string,
  enabled: boolean
): Promise<TaskActionResult> {
  await requireAdmin();

  try {
    const supabase = createClient();

    if (!enabled) {
      const { error } = await supabase
        .from("url_tasks")
        .update({ is_enabled: false, next_run_at: null })
        .eq("id", id);
      if (error) return { error: `操作失败：${error.message}` };
    } else {
      const { data: task, error: fetchError } = await supabase
        .from("url_tasks")
        .select("*")
        .eq("id", id)
        .single<UrlTask>();
      if (fetchError || !task) {
        return { error: "任务不存在或已被删除" };
      }
      const nextRun = computeNextRun(task, new Date());
      const { error } = await supabase
        .from("url_tasks")
        .update({ is_enabled: true, next_run_at: nextRun?.toISOString() ?? null })
        .eq("id", id);
      if (error) return { error: `操作失败：${error.message}` };
    }

    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "操作失败，请稍后重试",
    };
  }
}
