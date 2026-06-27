"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listOrders } from "@/lib/ordersApi";
import { Plus, ShoppingCart, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "COMPLETED", "CANCELLED"];

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CONFIRMED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PREPARING: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  READY: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  DELIVERED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await listOrders();
        setOrders(data.results || data || []);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading orders...</p>
        </div>
      </div>
    );
  }

  // Group orders by status
  const ordersByStatus = ORDER_STATUSES.map((status) => ({
    status,
    items: orders.filter((o) => o.status === status),
  }));

  // Include any extra statuses that might not be in our predefined list
  const otherStatuses = Array.from(new Set(orders.map((o) => o.status).filter((s) => !ORDER_STATUSES.includes(s))));
  otherStatuses.forEach((status) => {
    ordersByStatus.push({
      status,
      items: orders.filter((o) => o.status === status),
    });
  });

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-indigo-400" /> All Orders
        </h1>
        <Link href="/dashboard/orders/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> New Order
          </Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl flex-shrink-0">
          <p className="text-slate-400">No active orders found.</p>
          <Link href="/dashboard/orders/new" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">
            Create a new order →
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 overflow-x-auto pb-4 gap-6 snap-x">
          {ordersByStatus.filter(col => col.items.length > 0 || ORDER_STATUSES.slice(0,4).includes(col.status)).map((column) => (
            <div key={column.status} className="w-[320px] flex-shrink-0 flex flex-col snap-start">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full", 
                    statusColors[column.status] ? statusColors[column.status].split(" ")[0].replace("/10", "") : "bg-slate-500"
                  )} />
                  {column.status.replace("_", " ")}
                </h3>
                <span className="text-xs font-medium text-slate-400 bg-white/[0.05] px-2 py-0.5 rounded-full">
                  {column.items.length}
                </span>
              </div>
              
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 pb-2">
                {column.items.map((order) => (
                  <Link href={`/dashboard/orders/${order.id}`} key={order.id} className="block">
                    <Card className="hover:bg-white/[0.06] transition-colors group cursor-pointer border-white/[0.05]">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                              {order.order_number}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Table {order.table_number_display || order.table_number || "N/A"}
                            </p>
                          </div>
                          <span className="text-emerald-400 font-bold text-sm">
                            ${parseFloat(order.total_amount || 0).toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-white/5">
                          <span>{order.items?.length || 0} items</span>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                
                {column.items.length === 0 && (
                  <div className="border border-dashed border-white/5 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500">No {column.status.toLowerCase()} orders</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}