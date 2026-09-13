"use client";

import * as React from "react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LoaderCircle, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTaskAction, updateTaskAction } from "@/lib/actions/tasks";
import type { TaskInput } from "@/types/task";
import type { UrlTask } from "@/types/database";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 传入则为编辑模式，否则为新增 */
  task?: UrlTask | null;
}

interface HeaderRow {
  key: string;
  value: string;
}

type FormErrors = Partial<
  Record<
    | "targetUrl"
    | "cronExpr"
    | "randomMin"
    | "randomMax"
    | "loginUrl"
    | "username"
    | "password",
    string
  >
>;

/** URL 简单合法性校验 */
function isUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 任务表单弹窗（新增 / 编辑共用）：
 * 目标 URL、启停、调度策略（Cron / 随机间隔）、目标站点鉴权配置（可选）
 */
export function TaskFormDialog({ open, onOpenChange, task }: TaskFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(task);

  // ---- 表单状态 ----
  const [targetUrl, setTargetUrl] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [scheduleType, setScheduleType] = useState<"cron" | "random">("cron");
  const [cronExpr, setCronExpr] = useState("*/5 * * * *");
  const [randomMin, setRandomMin] = useState("30");
  const [randomMax, setRandomMax] = useState("120");

  const [authEnabled, setAuthEnabled] = useState(false);
  const [loginUrl, setLoginUrl] = useState("");
  const [usernameSelector, setUsernameSelector] = useState("");
  const [passwordSelector, setPasswordSelector] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitSelector, setSubmitSelector] = useState("");
  const [headers, setHeaders] = useState<HeaderRow[]>([{ key: "", value: "" }]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, startTransition] = useTransition();

  // 打开弹窗时初始化 / 回填表单
  useEffect(() => {
    if (!open) return;
    setErrors({});

    if (task) {
      setTargetUrl(task.target_url);
      setIsEnabled(task.is_enabled);
      setScheduleType(task.schedule_type ?? "cron");
      setCronExpr(task.cron_expr ?? "*/5 * * * *");
      setRandomMin(String(task.random_min_interval ?? 30));
      setRandomMax(String(task.random_max_interval ?? 120));

      const auth = task.auth_config;
      setAuthEnabled(Boolean(auth?.loginUrl));
      setLoginUrl(auth?.loginUrl ?? "");
      setUsernameSelector(auth?.usernameSelector ?? "");
      setPasswordSelector(auth?.passwordSelector ?? "");
      setUsername(auth?.username ?? "");
      setPassword(auth?.password ?? "");
      setSubmitSelector(auth?.submitSelector ?? "");
      const entries = Object.entries(auth?.headers ?? {});
      setHeaders(
        entries.length > 0
          ? entries.map(([key, value]) => ({ key, value: String(value) }))
          : [{ key: "", value: "" }]
      );
    } else {
      setTargetUrl("");
      setIsEnabled(true);
      setScheduleType("cron");
      setCronExpr("*/5 * * * *");
      setRandomMin("30");
      setRandomMax("120");
      setAuthEnabled(false);
      setLoginUrl("");
      setUsernameSelector("");
      setPasswordSelector("");
      setUsername("");
      setPassword("");
      setSubmitSelector("");
      setHeaders([{ key: "", value: "" }]);
    }
  }, [open, task]);

  /** 前端校验，返回是否通过 */
  function validate(): boolean {
    const errs: FormErrors = {};

    if (!isUrl(targetUrl)) {
      errs.targetUrl = "请输入合法的 URL（以 http:// 或 https:// 开头）";
    }

    if (scheduleType === "cron") {
      if (!cronExpr.trim()) {
        errs.cronExpr = "请填写 Cron 表达式";
      } else if (!/^\S+(\s+\S+){4,5}$/.test(cronExpr.trim())) {
        errs.cronExpr = "Cron 表达式应为 5 段（分 时 日 月 周），如 */5 * * * *";
      }
    } else {
      const min = Number(randomMin);
      const max = Number(randomMax);
      if (!Number.isInteger(min) || min < 1) errs.randomMin = "最小间隔需为 ≥ 1 的整数";
      if (!Number.isInteger(max) || max < 1) errs.randomMax = "最大间隔需为 ≥ 1 的整数";
      if (Number.isInteger(min) && Number.isInteger(max) && max < min) {
        errs.randomMax = "最大间隔不能小于最小间隔";
      }
    }

    if (authEnabled) {
      if (!isUrl(loginUrl)) errs.loginUrl = "请输入合法的登录页地址";
      if (!username.trim()) errs.username = "请填写登录账号";
      if (!password) errs.password = "请填写登录密码";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildInput(): TaskInput {
    return {
      targetUrl: targetUrl.trim(),
      isEnabled,
      scheduleType,
      cronExpr: scheduleType === "cron" ? cronExpr.trim() : undefined,
      randomMinInterval:
        scheduleType === "random" ? Number(randomMin) : undefined,
      randomMaxInterval:
        scheduleType === "random" ? Number(randomMax) : undefined,
      authConfig: authEnabled
        ? {
            type: "form",
            loginUrl: loginUrl.trim(),
            usernameSelector: usernameSelector.trim() || undefined,
            passwordSelector: passwordSelector.trim() || undefined,
            username: username.trim(),
            password,
            submitSelector: submitSelector.trim() || undefined,
            headers: Object.fromEntries(
              headers
                .filter((h) => h.key.trim())
                .map((h) => [h.key.trim(), h.value.trim()])
            ),
          }
        : null,
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) {
      toast.error("表单存在校验错误，请检查后重试");
      return;
    }

    const input = buildInput();
    startTransition(async () => {
      try {
        const result = isEdit && task
          ? await updateTaskAction(task.id, input)
          : await createTaskAction(input);

        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(isEdit ? "任务已更新" : "任务已创建");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "提交失败，请稍后重试"
        );
      }
    });
  }

  function updateHeader(index: number, field: keyof HeaderRow, value: string) {
    setHeaders((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑任务" : "新增任务"}</DialogTitle>
          <DialogDescription>
            配置目标 URL 的访问策略与鉴权信息，保存后立即生效。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* ---------- 基本信息 ---------- */}
          <section className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-url">
                目标访问 URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="target-url"
                placeholder="https://example.com/page"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                disabled={pending}
              />
              {errors.targetUrl ? (
                <p className="text-xs text-destructive">{errors.targetUrl}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="task-enabled">启用任务</Label>
                <p className="text-xs text-muted-foreground">
                  禁用后调度器将跳过该任务
                </p>
              </div>
              <Switch
                id="task-enabled"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                disabled={pending}
              />
            </div>
          </section>

          <Separator />

          {/* ---------- 调度策略 ---------- */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">访问策略</h3>
              <Badge variant="secondary">必选</Badge>
            </div>

            <div className="space-y-2">
              <Label>策略类型</Label>
              <Select
                value={scheduleType}
                onValueChange={(v) => setScheduleType(v as "cron" | "random")}
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择策略类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cron">定时访问（Cron 表达式）</SelectItem>
                  <SelectItem value="random">随机间隔访问</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scheduleType === "cron" ? (
              <div className="space-y-2">
                <Label htmlFor="cron-expr">
                  Cron 表达式 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cron-expr"
                  placeholder="*/5 * * * *（每 5 分钟）"
                  value={cronExpr}
                  onChange={(e) => setCronExpr(e.target.value)}
                  disabled={pending}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  标准 5 段格式：分 时 日 月 周（服务器按东八区解释示例仅作展示）
                </p>
                {errors.cronExpr ? (
                  <p className="text-xs text-destructive">{errors.cronExpr}</p>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="random-min">
                    最小间隔（分钟） <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="random-min"
                    type="number"
                    min={1}
                    placeholder="30"
                    value={randomMin}
                    onChange={(e) => setRandomMin(e.target.value)}
                    disabled={pending}
                  />
                  {errors.randomMin ? (
                    <p className="text-xs text-destructive">{errors.randomMin}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="random-max">
                    最大间隔（分钟） <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="random-max"
                    type="number"
                    min={1}
                    placeholder="120"
                    value={randomMax}
                    onChange={(e) => setRandomMax(e.target.value)}
                    disabled={pending}
                  />
                  {errors.randomMax ? (
                    <p className="text-xs text-destructive">{errors.randomMax}</p>
                  ) : null}
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  每次执行后，在 [最小, 最大] 区间内随机取值作为下次执行间隔。
                </p>
              </div>
            )}
          </section>

          <Separator />

          {/* ---------- 鉴权配置（可选） ---------- */}
          <section className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="auth-enabled">目标站点鉴权配置</Label>
                <p className="text-xs text-muted-foreground">
                  目标 URL 需要登录时开启，访问前将自动完成登录
                </p>
              </div>
              <Switch
                id="auth-enabled"
                checked={authEnabled}
                onCheckedChange={setAuthEnabled}
                disabled={pending}
              />
            </div>

            {authEnabled ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>鉴权类型</Label>
                    <Select value="form" disabled>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="form">表单登录</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">预留扩展</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-url">
                      登录页面地址 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="login-url"
                      placeholder="https://example.com/login"
                      value={loginUrl}
                      onChange={(e) => setLoginUrl(e.target.value)}
                      disabled={pending}
                    />
                    {errors.loginUrl ? (
                      <p className="text-xs text-destructive">{errors.loginUrl}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username-selector">账号输入框选择器</Label>
                    <Input
                      id="username-selector"
                      placeholder="[name=username] 或 username"
                      value={usernameSelector}
                      onChange={(e) => setUsernameSelector(e.target.value)}
                      disabled={pending}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      CSS 选择器或 name 属性
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-selector">密码输入框选择器</Label>
                    <Input
                      id="password-selector"
                      placeholder="[name=password] 或 password"
                      value={passwordSelector}
                      onChange={(e) => setPasswordSelector(e.target.value)}
                      disabled={pending}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="auth-username">
                      账号 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="auth-username"
                      placeholder="登录账号"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={pending}
                      autoComplete="off"
                    />
                    {errors.username ? (
                      <p className="text-xs text-destructive">{errors.username}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auth-password">
                      密码 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="auth-password"
                      type="password"
                      placeholder="登录密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={pending}
                      autoComplete="new-password"
                    />
                    {errors.password ? (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="submit-selector">登录提交按钮选择器</Label>
                  <Input
                    id="submit-selector"
                    placeholder="button[type=submit]"
                    value={submitSelector}
                    onChange={(e) => setSubmitSelector(e.target.value)}
                    disabled={pending}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    HTTP 模式下暂不使用，供后续浏览器自动化扩展
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>自定义请求头</Label>
                  <p className="text-xs text-muted-foreground">
                    访问目标页面与登录时都会携带以下请求头
                  </p>
                  <div className="space-y-2">
                    {headers.map((row, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="Header 名，如 X-API-Key"
                          value={row.key}
                          onChange={(e) =>
                            updateHeader(index, "key", e.target.value)
                          }
                          disabled={pending}
                          className="font-mono text-xs"
                        />
                        <Input
                          placeholder="值"
                          value={row.value}
                          onChange={(e) =>
                            updateHeader(index, "value", e.target.value)
                          }
                          disabled={pending}
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setHeaders((prev) =>
                              prev.length > 1
                                ? prev.filter((_, i) => i !== index)
                                : [{ key: "", value: "" }]
                            )
                          }
                          disabled={pending}
                          aria-label="删除此请求头"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setHeaders((prev) => [...prev, { key: "", value: "" }])
                    }
                    disabled={pending}
                  >
                    <Plus />
                    添加请求头
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          {/* ---------- 提交 ---------- */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? "保存中..." : isEdit ? "保存修改" : "创建任务"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
