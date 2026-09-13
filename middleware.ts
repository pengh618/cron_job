import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

/**
 * 全局中间件：
 * 1. 刷新 Supabase 会话
 * 2. 拦截 /dashboard/*：未登录跳转登录页，非管理员返回 403
 * 3. 已登录管理员访问 /login 时直接进入后台
 * 注意：/api/* 不经过此中间件，调度接口由 CRON_SECRET 单独保护
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  if (path.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (user.email !== ADMIN_EMAIL) {
      return new NextResponse("403 禁止访问：仅管理员可访问后台", {
        status: 403,
      });
    }
  }

  if (path === "/login" && user && user.email === ADMIN_EMAIL) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // 排除 api、静态资源与图片
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
