"use client";

import { useMutation } from "convex/react";
import { adminApi } from "@/lib/api";
import { useSession } from "@/lib/session";

export function SignOut() {
  const { token, clear } = useSession();
  const logout = useMutation(adminApi.logout);
  if (!token) return null;
  return (
    <button
      className="ops-nav-link"
      onClick={() => {
        void logout({ token }).catch(() => {});
        clear();
      }}
    >
      Sign out
    </button>
  );
}
