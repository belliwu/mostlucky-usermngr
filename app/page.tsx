import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
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
            <h1 className="text-5xl font-bold tracking-tight text-slate-900">
              梁維環控平台
            </h1>
            <p className="mt-4 text-slate-700">
              使用者註冊、登入與簡易儀表板。
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
                <h2 className="text-xl font-semibold">梁維環控平台</h2>
                <p className="text-sm text-muted-foreground">
                  請選擇登入或建立帳號
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-3">
              <Link href="/login" className="w-full">
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600">
                  登入
                </Button>
              </Link>
              <Link href="/register" className="w-full">
                <Button variant="outline" className="w-full">
                  註冊
                </Button>
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
