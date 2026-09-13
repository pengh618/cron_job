/**
 * 数据库表结构类型定义（与 supabase/schema.sql 对应）
 */

export type ScheduleType = "cron" | "random";

/** 目标站点鉴权配置（auth_config jsonb 字段） */
export interface AuthConfig {
  /** 鉴权类型：表单登录（预留扩展） */
  type?: "form";
  /** 登录页面地址 */
  loginUrl?: string;
  /** 账号输入框选择器（CSS 选择器 / name 属性） */
  usernameSelector?: string;
  /** 密码输入框选择器 */
  passwordSelector?: string;
  /** 登录账号 */
  username?: string;
  /** 登录密码 */
  password?: string;
  /** 登录提交按钮选择器（HTTP 模式暂未使用，供浏览器自动化扩展） */
  submitSelector?: string;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

/** URL 任务表 url_tasks */
export interface UrlTask {
  id: string;
  created_at: string;
  target_url: string;
  is_enabled: boolean;
  schedule_type: ScheduleType;
  cron_expr: string | null;
  random_min_interval: number | null;
  random_max_interval: number | null;
  auth_config: AuthConfig | null;
  last_run_at: string | null;
  next_run_at: string | null;
}

/** 访问日志表 access_logs */
export interface AccessLog {
  id: string;
  task_id: string;
  run_at: string;
  status: "success" | "failed";
  response_code: number | null;
  message: string | null;
}

/** 日志关联任务信息（PostgREST 嵌套查询返回） */
export type AccessLogWithTask = AccessLog & {
  url_tasks: Pick<UrlTask, "target_url"> | null;
};
