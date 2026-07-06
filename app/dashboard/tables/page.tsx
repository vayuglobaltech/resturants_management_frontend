"use client";

import { TablesKanban } from "@/components/tables/TablesKanban";

export default function TablesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tables</h1>
        <span className="text-sm text-slate-400">Drag and drop to update status</span>
      </div>
      <TablesKanban />
    </div>
  );
}