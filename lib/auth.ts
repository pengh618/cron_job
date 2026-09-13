import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action 前置管理员校验：
 * - 未登录 → 跳转登录页
 * - 非管理员邮箱 → 抛出异常（前端以 toast 提示）
 */
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.email !== process.env.ADMIN_EMAIL) {
    throw new Error("禁止访问：仅管理员可执行此操作");
  }

  return user;
}
