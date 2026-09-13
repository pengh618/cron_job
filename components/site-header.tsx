"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "概览" },
  { href: "/dashboard/tasks", label: "任务管理" },
  { href: "/dashboard/logs", label: "访问日志" },
];

/** 后台顶部导航：导航链接 + 主题切换 + 退出登录 */
export function SiteHeader({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:gap-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <Clock className="h-5 w-5" />
          <span className="hidden sm:inline">URL 调度管理后台</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <span
            className="hidden max-w-[200px] truncate text-xs text-muted-foreground md:inline"
            title={email}
          >
            {email}
          </span>
          <ThemeToggle />
          <form action={logout}>
            <Button
              variant="ghost"
              size="icon"
              type="submit"
              title="退出登录"
              aria-label="退出登录"
            >
              <LogOut />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
