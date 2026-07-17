"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function ProtectedOrder({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      const role = user.role && typeof user.role === "object" ? user.role.name : null;
      const allowedRoles = ["admin", "branch_manager", "waiter","cashier"];
      if (!role || !allowedRoles.includes(role)) {
        router.push("/dashboard/orders");
      }
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}