import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

/**
 * 后台布局：二次管理员校验（中间件已拦截，此处防御式兜底）
 * 未登录跳转登录页；非管理员渲染 403 页面
 */
export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.email !== process.env.ADMIN_EMAIL) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">403 - 禁止访问</h1>
          <p className="text-sm text-muted-foreground">
            当前账号（{user.email}）不是管理员，无权访问后台。
          </p>
        </div>
        <form action={logout}>
          <Button variant="outline" type="submit">
            退出登录
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <SiteHeader email={user.email ?? ""} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
