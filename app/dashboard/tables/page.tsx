"use client";

import Link from "next/link";
import { TablesKanban } from "@/components/tables/TablesKanban";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { useCanManage } from "@/hooks/useCanManage";

export default function TablesPage() {
  const canManage = useCanManage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Tables</h1>
        <div className="flex items-center gap-3">
          {canManage && (
            <Link href="/dashboard/tables/add">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Table
              </Button>
            </Link>
          )}
          <span className="text-sm text-slate-400">Drag and drop to update status</span>
        </div>
      </div>
      <TablesKanban />
    </div>
  );
}