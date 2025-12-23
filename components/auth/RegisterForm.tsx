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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

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
          router.push(result.redirectTo);
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

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "註冊中..." : "註冊"}
      </Button>
    </form>
  );
}
