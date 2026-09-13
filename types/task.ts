import type { AuthConfig } from "./database";

/**
 * 任务表单提交参数（客户端 → Server Action）
 */
export interface TaskInput {
  targetUrl: string;
  isEnabled: boolean;
  scheduleType: "cron" | "random";
  /** 定时访问：Cron 表达式（scheduleType 为 cron 时必填） */
  cronExpr?: string;
  /** 随机访问：最小间隔（分钟） */
  randomMinInterval?: number;
  /** 随机访问：最大间隔（分钟） */
  randomMaxInterval?: number;
  /** 目标站点鉴权配置，为 null 表示不启用鉴权 */
  authConfig: (AuthConfig & {
    loginUrl: string;
    username: string;
    password: string;
  }) | null;
}
