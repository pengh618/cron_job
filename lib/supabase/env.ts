/**
 * Supabase 环境变量读取与校验
 * 缺失时抛出带排查指引的友好错误，替代 supabase-js 的原始英文报错
 */

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** 校验并返回公开的 Supabase 环境变量 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "缺少 Supabase 环境变量：NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY。" +
        "本地开发请复制 .env.example 为 .env.local 并填写（Supabase Dashboard → Project Settings → API）；" +
        "Vercel 部署请在 Settings → Environment Variables 配置后重新部署。"
    );
  }

  return { url, anonKey };
}

/** 校验并返回 service role 密钥（仅调度接口使用） */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "缺少环境变量 SUPABASE_SERVICE_ROLE_KEY（调度接口专用，在 Supabase Dashboard → Project Settings → API → service_role 获取）"
    );
  }
  return key;
}
