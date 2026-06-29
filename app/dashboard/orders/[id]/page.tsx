"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOrder, updateOrder } from "@/lib/ordersApi";
import { useAuth } from "@/context/AuthContext";
import { useCanManage } from "@/hooks/useCanManage";
import {
  ArrowLeft,
  Clock,
  ShoppingCart,
  User,
  CheckCircle2,
  ChevronRight,
  Hash,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Status colors
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CONFIRMED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  QUEUED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  PREPARING: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  READY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  DELIVERED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  PAID: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

// Role-based allowed transitions
const ROLE_TRANSITIONS: Record<string, string[]> = {
  waiter: ["CONFIRMED", "DELIVERED", "CANCELLED"],
  kitchen_staff: ["QUEUED", "PREPARING", "READY"],
  cashier: ["PAID"],
  admin: [],
  branch_manager: [],
};

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const canManage = useCanManage();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");

  const fetchOrder = async () => {
    try {
      const data = await getOrder(id);
      setOrder(data);
      setSelectedStatus(data.status);
    } catch (error) {
      console.error("Failed to fetch order details:", error);
      toast.error("Order not found.");
      router.push("/dashboard/orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const role = user?.role && typeof user.role === "object" ? user.role.name : null;

  const getAvailableStatuses = () => {
    if (!order) return [];
    const current = order.status;
    // Admin/Manager can update to any status
    if (role === "admin" || role === "branch_manager") {
      return Object.keys(STATUS_COLORS);
    }
    const allowed = ROLE_TRANSITIONS[role || ""] || [];
    const validTransitions: Record<string, string[]> = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["QUEUED", "CANCELLED"],
      QUEUED: ["PREPARING"],
      PREPARING: ["READY"],
      READY: ["DELIVERED"],
      DELIVERED: ["PAID"],
      PAID: [],
      CANCELLED: [],
    };
    const allowedFromCurrent = validTransitions[current] || [];
    return allowed.filter((s) => allowedFromCurrent.includes(s));
  };

  const availableStatuses = getAvailableStatuses();

  const handleUpdateStatus = async () => {
    if (!selectedStatus || selectedStatus === order.status) return;
    setUpdating(true);
    try {
      await updateOrder(id, { status: selectedStatus });
      toast.success(`Order status updated to ${selectedStatus}`);
      fetchOrder();
    } catch (error: any) {
      const msg = error?.detail || error?.message || "Failed to update status.";
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Order not found.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[order.status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Breadcrumb & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/dashboard/orders" className="hover:text-white transition-colors">
            Orders
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-white font-medium">{order.order_number}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("px-3 py-1 text-xs font-semibold rounded-full border", statusColor)}>
            {order.status}
          </span>

          {/* Status update dropdown – only if there are available transitions */}
          {availableStatuses.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Status</option>
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleUpdateStatus}
                disabled={updating || selectedStatus === order.status}
                className="gap-1.5"
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {updating ? "Updating..." : "Update"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-white/[0.05] bg-white/[0.02]">
            <CardHeader className="pb-4 border-b border-white/[0.05]">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-400" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/[0.05]">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                          <span className="text-indigo-400 font-bold">{item.quantity}x</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{item.product_name || "Unknown Product"}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">SKU: {item.product_sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">${parseFloat(item.price_at_order).toFixed(2)}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          ${(parseFloat(item.price_at_order) * item.quantity).toFixed(2)} total
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400">No items in this order.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes / Special Instructions */}
          {order.special_instructions && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-amber-400 mb-2">Special Instructions</h4>
                <p className="text-sm text-slate-300">{order.special_instructions}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Order Details Summary */}
        <div className="space-y-6">
          <Card className="border-white/[0.05] bg-white/[0.02]">
            <CardHeader className="pb-4 border-b border-white/[0.05]">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><Hash className="h-4 w-4"/> Order ID</span>
                <span className="text-white">{order.order_number}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><User className="h-4 w-4"/> Server/User</span>
                <span className="text-white">{order.user_name || "Guest"}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><Clock className="h-4 w-4"/> Created At</span>
                <span className="text-white">
                  {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> Priority</span>
                <span className="text-white">{order.priority}</span>
              </div>

              <div className="pt-4 border-t border-white/[0.05]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Total Amount</span>
                  <span className="text-xl font-bold text-emerald-400">
                    ${parseFloat(order.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}