import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

function LoginPageContent() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="min-h-screen grid lg:grid-cols-2">
        <section className="relative hidden lg:flex flex-col justify-center px-12">
          <div className="absolute inset-0">
            <Image
              src="/auth-hero.svg"
              alt="品牌展示背景"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-white/30" />
          </div>

          <div className="relative max-w-lg">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">
              梁維環控平台
            </h2>
            <p className="mt-4 text-slate-700">
              安全登入、簡潔管理，讓使用者驗證更可靠。
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md rounded-2xl bg-background p-8 shadow-xl border border-border">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="梁維環控平台"
                width={44}
                height={44}
              />
              <div>
                <h1 className="text-xl font-semibold">梁維環控平台 | 登入</h1>
                <p className="text-sm text-muted-foreground">
                  請輸入帳號及密碼!!
                </p>
              </div>
            </div>

            <div className="mt-8">
              <LoginForm />
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">尚未擁有帳號？</span>{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                立即註冊
              </Link>
            </div>

            <div className="mt-8 text-center text-xs text-muted-foreground">
              Copyright © 2025 梁維環控平台
            </div>
          </div>
        </section>
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
