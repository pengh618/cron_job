import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, getServiceRoleKey } from "./env";

/**
 * Service Role 客户端（绕过 RLS，仅限服务端使用）
 * 仅用于调度接口（/api/scheduler），严禁暴露到客户端
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();

  return createSupabaseClient(url, getServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
