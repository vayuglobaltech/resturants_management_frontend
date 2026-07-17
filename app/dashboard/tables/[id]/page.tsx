"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getTable, updateTable } from "@/lib/tableApi";
import { listOrders } from "@/lib/ordersApi";
import { useAuth } from "@/context/AuthContext";
import { useCanManage } from "@/hooks/useCanManage";
import {
  ArrowLeft,
  Loader2,
  Users,
  Clock,
  User,
  Receipt,
  DollarSign,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  OCCUPIED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  RESERVED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  OUT_OF_SERVICE: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  OUT_OF_SERVICE: "Out of Service",
};

function formatSmartTimestamp(dateString: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const canManage = useCanManage();

  // ─── Check if user is a waiter (redirect) ──────────────────────────
  const userRole = user?.role && typeof user.role === "object" ? user.role.name : user?.role;
  const isWaiter = userRole?.toLowerCase() === "waiter";

  useEffect(() => {
    if (isWaiter) {
      toast.error("You don't have permission to view table details.");
      router.replace("/dashboard/tables");
    }
  }, [isWaiter, router]);

  const [table, setTable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchTable = async () => {
    try {
      const data = await getTable(id);
      setTable(data);
      setSelectedStatus(data.status);
    } catch (error) {
      toast.error("Table not found.");
      router.push("/dashboard/tables");
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayOrders = async () => {
    if (!id) return;
    setLoadingOrders(true);
    try {
      const tableId = parseInt(id);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      const data = await listOrders(tableId);
      const allOrders = data.results || data || [];
      const todayOrders = allOrders.filter((order: any) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= startOfDay && orderDate < endOfDay;
      });
      todayOrders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(todayOrders);
    } catch (error) {
      console.error("Failed to fetch today's orders:", error);
      toast.error("Could not load order history.");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchTable();
  }, [id]);

  useEffect(() => {
    if (table) fetchTodayOrders();
  }, [table]);

  const handleStatusUpdate = async () => {
    if (!selectedStatus || selectedStatus === table.status) return;
    setUpdating(true);
    try {
      await updateTable(parseInt(id), { status: selectedStatus });
      toast.success(`Table status updated to ${STATUS_LABELS[selectedStatus]}`);
      fetchTable();
    } catch (error: any) {
      toast.error(error?.detail || "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Table not found.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[table.status] || "bg-slate-500/20 text-muted-foreground";

  // ─── Determine status label ──────────────────────────────────────
  let statusLabel = "";
  let timestamp = null;

  if (table.status === "OCCUPIED" && table.occupied_since) {
    statusLabel = "Occupied Since";
    timestamp = table.occupied_since;
  } else if (table.status === "AVAILABLE" && table.updated_at) {
    statusLabel = "Available Since";
    timestamp = table.updated_at;
  } else if (table.status === "RESERVED" && table.reserved_since) {
    statusLabel = "Reserved Since";
    timestamp = table.reserved_since;
  } else if (table.status === "OUT_OF_SERVICE" && table.updated_at) {
    statusLabel = "Changed At";
    timestamp = table.updated_at;
  } else if (table.updated_at) {
    statusLabel = "Last Updated";
    timestamp = table.updated_at;
  } else {
    statusLabel = "";
    timestamp = null;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/dashboard/tables">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Tables
        </Button>
      </Link>

      <Card className="bg-muted/30 border-border">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Users className="h-6 w-6 text-indigo-400" />
              </div>
              <CardTitle className="text-2xl text-foreground">
                Table {table.table_number}
              </CardTitle>
            </div>
            <Badge className={cn("text-sm px-4 py-1.5", statusColor)}>
              {STATUS_LABELS[table.status] || table.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {canManage && (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-background rounded-lg border border-border">
              <span className="text-sm text-muted-foreground">Change Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={updating}
              >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleStatusUpdate}
                disabled={updating || selectedStatus === table.status}
              >
                {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Update"}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Capacity</span>
              <span className="text-foreground font-medium">{table.capacity} Persons</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Area</span>
              <span className="text-foreground font-medium">{table.area || "—"}</span>
            </div>
            {statusLabel && timestamp && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{statusLabel}</span>
                <span className="text-foreground font-medium">
                  {formatSmartTimestamp(timestamp)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Today's Summary & History (ONLY for non-waiters) ────────── */}
      {!isWaiter && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-full bg-indigo-500/20">
                  <Receipt className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Orders</p>
                  <p className="text-xl font-bold">{orders.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-full bg-emerald-500/20">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Revenue</p>
                  <p className="text-xl font-bold">${totalRevenue.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-400" />
                <CardTitle className="text-lg text-foreground">Today's Order History</CardTitle>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {loadingOrders ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No orders today</p>
                  <p className="text-sm mt-1">Orders placed today will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-background rounded-lg border border-border p-4 hover:border-indigo-500/30 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="p-1.5 bg-indigo-500/10 rounded-md flex-shrink-0 mt-0.5">
                            <Receipt className="h-4 w-4 text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground text-sm truncate">
                              {order.order_number}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatSmartTimestamp(order.created_at)}
                              </span>
                              {order.user_name && (
                                <span className="flex items-center gap-1 text-sm font-semibold text-indigo-500">
                                  <User className="h-3.5 w-3.5" />
                                  {order.user_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {order.status}
                        </Badge>
                      </div>

                      <div className="mt-3 pl-9 space-y-1">
                        {(order.items || []).map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm py-0.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-muted-foreground text-xs w-6 text-right flex-shrink-0">
                                {item.quantity}×
                              </span>
                              <span className="text-foreground truncate">
                                {item.product_name}
                              </span>
                            </div>
                            <span className="text-muted-foreground text-sm flex-shrink-0 ml-4">
                              ${(parseFloat(item.price_at_order || 0) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 pt-2 border-t border-border/50 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="text-sm font-bold text-foreground">
                          ${parseFloat(order.total_amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── Message for waiters ────────────────────────────────────────── */}
      {isWaiter && (
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-amber-400">
              You don't have permission to view order history or revenue details.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}