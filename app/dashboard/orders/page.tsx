"use client";

import { KanbanBoard } from "@/components/orders/KanbanBoard";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <Link href="/dashboard/orders/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Order
          </Button>
        </Link>
      </div>

      <KanbanBoard />
    </div>
  );
}