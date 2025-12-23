import { redirect } from "next/navigation";
import { getUserInfoAction } from "@/actions/userActions";
import { UserInfo } from "@/components/dashboard/UserInfo";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

export default async function DashboardPage() {
  const userInfoResult = await getUserInfoAction();

  if (!userInfoResult.success || !userInfoResult.user) {
    redirect("/login?reason=session_expired");
  }

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">儀表板</h1>
            <p className="mt-2 text-muted-foreground">
              歡迎回來，{userInfoResult.user.email}
            </p>
          </div>

          <LogoutButton />
        </div>

        <UserInfo user={userInfoResult.user} />

        <div className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">快速連結</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded p-4">
              <h3 className="font-medium mb-2">個人資料</h3>
              <p className="text-sm text-muted-foreground">
                查看和編輯您的個人資訊
              </p>
            </div>

            {userInfoResult.user.role === "admin" && (
              <div className="bg-card border border-border rounded p-4">
                <h3 className="font-medium mb-2">使用者管理</h3>
                <p className="text-sm text-muted-foreground">
                  管理系統使用者（僅管理員）
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
