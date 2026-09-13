"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Laptop, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * 明暗主题切换按钮：循环切换 浅色 → 深色 → 跟随系统
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 避免 SSR 与客户端主题不一致导致的水合警告
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled aria-label="切换主题">
        <Sun />
      </Button>
    );
  }

  function toggle() {
    const next =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  }

  const label =
    theme === "system" ? `跟随系统（当前${resolvedTheme === "dark" ? "深色" : "浅色"}）` : theme === "dark" ? "深色模式" : "浅色模式";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="切换主题"
      title={label}
    >
      {theme === "dark" ? (
        <Moon />
      ) : theme === "system" ? (
        <Laptop />
      ) : (
        <Sun />
      )}
    </Button>
  );
}
