import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/services/authService";

/**
 * Next.js Middleware
 * 保護受保護路由，驗證 JWT token
 */

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "auth_session";

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

  // 驗證 session
  const sessionResult = await verifySession(token);

  if (!sessionResult.valid) {
    // Session 無效，導向登入頁
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "session_expired");
    loginUrl.searchParams.set("redirect", pathname);

    // 清除無效 cookie
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);

    return response;
  }

  // 檢查 admin 路由的權限
  if (pathname.startsWith("/admin")) {
    if (sessionResult.user?.role !== "admin") {
      // 沒有 admin 權限，導向 dashboard 並附帶錯誤訊息
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("error", "permission_denied");
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // 驗證通過，允許訪問
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
