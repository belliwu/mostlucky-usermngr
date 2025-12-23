import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">註冊新帳號</h1>
          <p className="mt-2 text-muted-foreground">建立您的帳號以開始使用</p>
        </div>

        <RegisterForm />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">已有帳號？</span>{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            立即登入
          </Link>
        </div>
      </div>
    </main>
  );
}
