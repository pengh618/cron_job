import { redirect } from "next/navigation";

/** 根路径直接进入后台（未登录会被中间件重定向到登录页） */
export default function Home() {
  redirect("/dashboard");
}
