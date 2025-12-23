import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware
 * 保護受保護路由，檢查 JWT token 是否存在
 * 注意：在 Edge Runtime 中不能使用 Node.js 模塊，所以只檢查 token 存在性
 * 實際的 token 驗證在 Server Components/Actions 中進行
 */

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只處理受保護路由 /dashboard 和 /admin
  if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // 取得 token
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    // 未登入，導向登入頁並附帶 reason
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "need_login");
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token 存在，允許訪問
  // 實際的驗證會在 Server Component 中進行
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
