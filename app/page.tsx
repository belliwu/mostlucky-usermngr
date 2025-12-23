import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold mb-4">使用者管理系統</h1>
        <p className="text-xl text-muted-foreground mb-8">
          歡迎使用我們的身份驗證系統
        </p>
        <div className="flex gap-4">
          <Link href="/login">
            <Button>登入</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline">註冊</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
