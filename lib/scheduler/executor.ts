import type { AuthConfig, UrlTask } from "@/types/database";

/** 单次访问执行结果（写入 access_logs） */
export interface VisitResult {
  status: "success" | "failed";
  responseCode: number | null;
  message: string | null;
}

/** 单次请求超时（毫秒），防止拖垮整个 Vercel 函数 */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * 带超时的 fetch 封装
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: "follow",
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError" || /aborted/i.test(err.message)) {
      return "请求超时";
    }
    return err.message;
  }
  return String(err);
}

/**
 * 从选择器中提取表单字段 name：
 * 支持 [name=xxx]、input[name="xxx"]、#id、或直接写字段名
 */
export function fieldNameFromSelector(
  selector: string,
  fallback: string
): string {
  const s = selector.trim();
  if (!s) return fallback;
  const nameMatch = s.match(/\[\s*name\s*=\s*["']?([^"\]']+)["']?\s*\]/i);
  if (nameMatch?.[1]) return nameMatch[1];
  const idMatch = s.match(/^(?:input\#|#)([A-Za-z0-9_\-]+)$/);
  if (idMatch?.[1]) return idMatch[1];
  return s;
}

/** 收集响应中的 Set-Cookie 到简易 Cookie Jar */
function collectCookies(res: Response): Record<string, string> {
  const jar: Record<string, string> = {};
  // Node 18.14+ / 20 的 undici 提供 getSetCookie()
  const headers = res.headers as unknown as { getSetCookie?: () => string[] };
  const rawList =
    typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  for (const raw of rawList) {
    const pair = raw.split(";")[0] ?? "";
    const idx = pair.indexOf("=");
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) jar[key] = value;
  }
  return jar;
}

function cookieHeader(jar: Record<string, string>): string {
  return Object.entries(jar)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

/** 清洗自定义请求头，防止请求头注入 */
function sanitizeHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers) return result;
  for (const [key, value] of Object.entries(headers)) {
    const k = String(key).trim();
    const v = String(value ?? "");
    if (!k || /[\r\n]/.test(k) || /[\r\n]/.test(v)) continue;
    result[k] = v;
  }
  return result;
}

/**
 * 表单登录（HTTP 模式）：
 * 1. GET 登录页获取初始 Cookie（部分站点依赖会话）
 * 2. POST 账号密码表单
 * 3. 汇总返回登录后的 Cookie 串
 *
 * 说明：基于 HTTP 请求实现，适用于标准表单登录站点；
 * 若目标站点依赖 JS 渲染 / 验证码 / CSRF Token，可扩展 Playwright 浏览器方案。
 */
async function formLogin(auth: AuthConfig): Promise<string> {
  const loginUrl = (auth.loginUrl ?? "").trim();
  if (!loginUrl) return "";
  const customHeaders = sanitizeHeaders(auth.headers);
  const jar: Record<string, string> = {};

  // 1. GET 登录页（失败不中断，继续尝试 POST）
  try {
    const pageRes = await fetchWithTimeout(loginUrl, {
      headers: { ...customHeaders },
    });
    Object.assign(jar, collectCookies(pageRes));
  } catch {
    // 忽略：登录页可能禁止 GET 或直接要求 POST
  }

  // 2. POST 登录表单
  const usernameField = fieldNameFromSelector(
    auth.usernameSelector ?? "",
    "username"
  );
  const passwordField = fieldNameFromSelector(
    auth.passwordSelector ?? "",
    "password"
  );

  const form = new URLSearchParams();
  form.set(usernameField, auth.username ?? "");
  form.set(passwordField, auth.password ?? "");

  const postRes = await fetchWithTimeout(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: loginUrl,
      ...customHeaders,
      ...(Object.keys(jar).length > 0 ? { Cookie: cookieHeader(jar) } : {}),
    },
    body: form.toString(),
  });

  // 3. 合并登录后的 Cookie（登录态会话通常在此下发）
  Object.assign(jar, collectCookies(postRes));
  return cookieHeader(jar);
}

/**
 * 执行单次任务访问：
 * - 若配置了鉴权，先完成目标站点登录获取 Cookie
 * - 携带 Cookie 与自定义请求头访问目标 URL
 * - 返回执行结果（成功 / 失败、HTTP 状态码、错误信息）
 */
export async function executeTask(task: UrlTask): Promise<VisitResult> {
  const customHeaders = sanitizeHeaders(task.auth_config?.headers);
  let cookie: string | undefined;

  // 前置登录
  if (task.auth_config?.loginUrl && task.auth_config?.username) {
    try {
      cookie = (await formLogin(task.auth_config)) || undefined;
    } catch (err) {
      return {
        status: "failed",
        responseCode: null,
        message: `目标站点登录失败：${errorMessage(err)}`,
      };
    }
  }

  // 访问目标页面
  try {
    const res = await fetchWithTimeout(task.target_url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; cron-job-scheduler/1.0; +https://vercel.com)",
        ...customHeaders,
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });

    if (res.ok) {
      return { status: "success", responseCode: res.status, message: null };
    }
    return {
      status: "failed",
      responseCode: res.status,
      message: `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`,
    };
  } catch (err) {
    return {
      status: "failed",
      responseCode: null,
      message: `访问失败：${errorMessage(err)}`,
    };
  }
}
