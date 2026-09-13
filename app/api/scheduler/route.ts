import { NextResponse, type NextRequest } from "next/server";
import { runScheduler } from "@/lib/scheduler";

/**
 * 调度接口（由 Vercel Cron 定时触发）
 * 安全：请求头需携带 CRON_SECRET（Vercel Cron 自动附加 Authorization: Bearer <secret>）
 */

// 触发时实时调度，不缓存
export const dynamic = "force-dynamic";
// 声明 Vercel 函数最大时长（Hobby 默认 60s，Pro 可配置更长）
export const maxDuration = 60;

/** 校验请求密钥：Authorization: Bearer <CRON_SECRET> 或 X-Cron-Secret 头 */
function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // 未配置密钥时一律拒绝（fail closed）
  if (!secret) return false;

  const bearer = (request.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const alt = (request.headers.get("x-cron-secret") ?? "").trim();
  return (bearer !== "" && bearer === secret) || (alt !== "" && alt === secret);
}

async function handler(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized：密钥缺失或不正确" },
      { status: 401 }
    );
  }

  try {
    const result = await runScheduler();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Vercel Cron 使用 GET 触发；同时支持 POST 便于外部调度服务调用
export { handler as GET, handler as POST };
