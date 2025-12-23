interface UserInfoProps {
  user: {
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    lastLoginAt?: string;
  };
}

export function UserInfo({ user }: UserInfoProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold">使用者資訊</h2>

      <div className="space-y-3">
        <div>
          <label className="text-sm text-muted-foreground">Email</label>
          <p className="text-lg font-medium">{user.email}</p>
        </div>

        <div>
          <label className="text-sm text-muted-foreground">角色</label>
          <p className="text-lg">
            <span
              className={`inline-block px-2 py-1 rounded text-sm ${
                user.role === "admin"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {user.role === "admin" ? "管理員" : "使用者"}
            </span>
          </p>
        </div>

        <div>
          <label className="text-sm text-muted-foreground">帳號狀態</label>
          <p className="text-lg">
            <span
              className={`inline-block px-2 py-1 rounded text-sm ${
                user.status === "active"
                  ? "bg-green-100 text-green-800"
                  : user.status === "locked"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {user.status === "active"
                ? "正常"
                : user.status === "locked"
                ? "已鎖定"
                : "已停用"}
            </span>
          </p>
        </div>

        <div>
          <label className="text-sm text-muted-foreground">註冊時間</label>
          <p className="text-lg">{formatDate(user.createdAt)}</p>
        </div>

        {user.lastLoginAt && (
          <div>
            <label className="text-sm text-muted-foreground">最後登入</label>
            <p className="text-lg">{formatDate(user.lastLoginAt)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
