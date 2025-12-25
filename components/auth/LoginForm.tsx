"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction } from "@/actions/authActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  showSuccessToast,
  showErrorToast,
  showSystemToast,
  TOAST_MESSAGES,
} from "@/lib/toast";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // 處理 URL 參數中的系統訊息
  useEffect(() => {
    const reason = searchParams.get("reason");
    const error = searchParams.get("error");

    if (reason === "need_login") {
      showSystemToast(TOAST_MESSAGES.NEED_LOGIN);
    } else if (reason === "session_expired") {
      showSystemToast(TOAST_MESSAGES.SESSION_EXPIRED);
    }

    if (error === "permission_denied") {
      showErrorToast(TOAST_MESSAGES.PERMISSION_DENIED);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    formData.set("rememberMe", rememberMe.toString());

    startTransition(async () => {
      const result = await loginAction(formData);

      if (result.success) {
        // 顯示成功 toast
        if (result.messageCode && result.messageCode in TOAST_MESSAGES) {
          showSuccessToast(
            TOAST_MESSAGES[result.messageCode as keyof typeof TOAST_MESSAGES]
          );
        }

        // 導向目標頁面或儀表板
        const redirect =
          searchParams.get("redirect") || result.redirectTo || "/dashboard";
        // 在 production/Vercel 下避免使用到未登入時的預取快取，確保帶著新 cookie 重新抓取資料
        router.replace(redirect);
        router.refresh();
      } else {
        // 顯示錯誤 toast
        if (result.messageCode && result.messageCode in TOAST_MESSAGES) {
          showErrorToast(
            TOAST_MESSAGES[result.messageCode as keyof typeof TOAST_MESSAGES]
          );
        } else {
          showErrorToast({
            title: "登入失敗",
            description: result.error || "請稍後再試",
          });
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          密碼
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="請輸入密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isPending}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          id="rememberMe"
          name="rememberMe"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label
          htmlFor="rememberMe"
          className="text-sm font-medium cursor-pointer"
        >
          記住我（保持登入 7 天）
        </label>
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600"
        disabled={isPending}
      >
        {isPending ? "登入中..." : "登入驗證"}
      </Button>
    </form>
  );
}
