import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { Suspense } from "react";

function LoginPageContent() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">登入</h1>
          <p className="mt-2 text-muted-foreground">歡迎回來！請登入您的帳號</p>
        </div>

        <LoginForm />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">還沒有帳號？</span>{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            立即註冊
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>載入中...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
