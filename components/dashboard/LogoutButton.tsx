"use client";

import { useRouter } from "next/navigation";
import { logoutAction } from "@/actions/authActions";
import { Button } from "@/components/ui/button";
import { showSuccessToast, TOAST_MESSAGES } from "@/lib/toast";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const result = await logoutAction();

    if (result.success) {
      showSuccessToast(TOAST_MESSAGES.LOGOUT_SUCCESS);
      if (result.redirectTo) {
        router.push(result.redirectTo);
      }
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleLogout}>
      登出
    </Button>
  );
}
