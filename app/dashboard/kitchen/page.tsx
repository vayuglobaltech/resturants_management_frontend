"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { listOrders, updateOrder } from "@/lib/ordersApi";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, Clock, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const KITCHEN_STATUSES = ["CONFIRMED", "QUEUED", "PREPARING", "READY"];

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  QUEUED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  PREPARING: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  READY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function KitchenPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await listOrders();
      const allOrders = data.results || data || [];
      const filtered = allOrders.filter((o: any) =>
        KITCHEN_STATUSES.includes(o.status)
      );
      setOrders(filtered);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    setUpdating(orderId);
    try {
      await updateOrder(orderId, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (error: any) {
      toast.error(error?.detail || "Failed to update status.");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ChefHat className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold text-foreground">Kitchen Queue</h2>
        <p className="text-muted-foreground mt-2">No pending orders in the kitchen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Kitchen Queue</h1>
        <span className="text-sm text-muted-foreground">{orders.length} orders</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => {
          const canUpdateTo = {
            CONFIRMED: "QUEUED",
            QUEUED: "PREPARING",
            PREPARING: "READY",
          };
          const nextStatus = canUpdateTo[order.status as keyof typeof canUpdateTo];
          const isUpdating = updating === order.id;

          return (
            <Card key={order.id} className="bg-muted/30 border-border p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-foreground font-semibold">{order.order_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    Table {order.table_number_display || order.table_number || "N/A"}
                  </p>
                  <span
                    className={cn(
                      "inline-block mt-2 text-xs px-2.5 py-1 rounded-full border",
                      STATUS_COLORS[order.status] || "bg-slate-500/20 text-muted-foreground"
                    )}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold">
                    ${parseFloat(order.total_amount || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{order.items?.length || 0} items</p>
                </div>
              </div>

              {nextStatus && (
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => handleStatusUpdate(order.id, nextStatus)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Mark as ${nextStatus}`
                  )}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}