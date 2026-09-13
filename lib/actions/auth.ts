"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** 将 Supabase 认证错误转换为友好提示 */
function humanizeAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "邮箱或密码错误";
  if (/email not confirmed/i.test(message)) return "邮箱尚未验证，请先完成邮箱验证";
  if (/rate limit/i.test(message)) return "尝试过于频繁，请稍后再试";
  return message;
}

/**
 * 邮箱 + 密码登录
 * 仅 ADMIN_EMAIL 指定的管理员邮箱允许登录，其他账号登录后立即登出并提示
 */
export async function loginAction(values: {
  email: string;
  password: string;
}): Promise<{ error?: string }> {
  const email = values.email.trim().toLowerCase();
  const password = values.password;

  if (!email || !password) {
    return { error: "请输入邮箱和密码" };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: `登录失败：${humanizeAuthError(error.message)}` };
  }

  // 非管理员账号：立即登出并拒绝
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || data.user?.email?.toLowerCase() !== adminEmail) {
    await supabase.auth.signOut();
    return { error: "该账号无权访问后台（仅管理员邮箱可登录）" };
  }

  return {}; // 登录成功，由前端跳转 /dashboard
}

/** 退出登录 */
export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
