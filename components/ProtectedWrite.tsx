"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCanManage } from "@/hooks/useCanManage";
import { useAuth } from "@/context/AuthContext";

export function ProtectedWrite({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading } = useAuth();
  const canManage = useCanManage();

  useEffect(() => {
    if (!isLoading && !canManage) {
      router.push("/dashboard/menu");
    }
  }, [isLoading, canManage, router]);

  if (isLoading || !canManage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}