import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service Role 客户端（绕过 RLS，仅限服务端使用）
 * 仅用于调度接口（/api/scheduler），严禁暴露到客户端
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
