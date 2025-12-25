"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerAction } from "@/actions/authActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showSuccessToast, showErrorToast, TOAST_MESSAGES } from "@/lib/toast";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    if (password !== confirmPassword) {
      showErrorToast({
        title: "註冊失敗",
        description: "密碼不一致，請重新確認",
      });
      return;
    }

    startTransition(async () => {
      const result = await registerAction(formData);

      if (result.success) {
        // 顯示成功 toast
        if (result.messageCode && result.messageCode in TOAST_MESSAGES) {
          showSuccessToast(
            TOAST_MESSAGES[result.messageCode as keyof typeof TOAST_MESSAGES]
          );
        }

        // 導向儀表板
        if (result.redirectTo) {
          // 在 production/Vercel 下避免使用到未登入時的預取快取，確保帶著新 cookie 重新抓取資料
          router.replace(result.redirectTo);
          router.refresh();
        }
      } else {
        // 顯示錯誤 toast
        if (result.messageCode && result.messageCode in TOAST_MESSAGES) {
          showErrorToast(
            TOAST_MESSAGES[result.messageCode as keyof typeof TOAST_MESSAGES]
          );
        } else {
          showErrorToast({
            title: "註冊失敗",
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
          placeholder="至少 8 個字元"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isPending}
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          確認密碼
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="請再次輸入密碼"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isPending}
          minLength={8}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600"
        disabled={isPending}
      >
        {isPending ? "註冊中..." : "建立帳號"}
      </Button>
    </form>
  );
}
