"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCorners,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { listOrders, updateOrder } from "@/lib/ordersApi";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Constants ──────────────────────────────────────────────────────────────

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "QUEUED",
  "PREPARING",
  "READY",
  "DELIVERED",
  "PAID",
  "CANCELLED",
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CONFIRMED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  QUEUED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  PREPARING: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  READY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  DELIVERED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  PAID: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  QUEUED: "Queued",
  PREPARING: "Preparing",
  READY: "Ready",
  DELIVERED: "Delivered",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

// ─── Sortable Order Card ────────────────────────────────────────────────────

interface OrderCardProps {
  order: any;
}

function OrderCard({ order }: OrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusColor = STATUS_COLORS[order.status] || "bg-slate-500/20 text-slate-400";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-grab active:cursor-grabbing touch-none"
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-white font-medium text-sm">{order.order_number}</h4>
          <p className="text-xs text-slate-400">Table {order.table_number_display || order.table_number}</p>
        </div>
        <Badge className={cn("text-xs", statusColor)}>
          {STATUS_LABELS[order.status] || order.status}
        </Badge>
      </div>
      <div className="mt-2 flex justify-between items-center">
        <div className="text-xs text-slate-400">
          {order.items?.length || 0} items
        </div>
        <div className="text-white font-bold text-sm">
          ${parseFloat(order.total_amount || 0).toFixed(2)}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column (Droppable) ─────────────────────────────────────────────

interface KanbanColumnProps {
  status: string;
  orders: any[];
}

function KanbanColumn({ status, orders }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[220px] max-w-[280px] bg-white/[0.02] rounded-xl p-3 border border-white/[0.05] transition-colors",
        isOver && "border-indigo-500/50 bg-indigo-500/5 shadow-lg shadow-indigo-500/20"
      )}
      style={{ minHeight: "400px" }} // ← Ensures droppable area is always tall enough
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">{STATUS_LABELS[status]}</h3>
        <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
          {orders.length}
        </span>
      </div>
      <div className="space-y-2">
        <SortableContext
          items={orders.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </SortableContext>
        {orders.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-8 border border-dashed border-white/10 rounded-lg">
            Drop orders here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban Board ─────────────────────────────────────────────────────

export function KanbanBoard() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const fetchOrders = async () => {
    try {
      const data = await listOrders();
      const allOrders = data.results || data || [];
      setOrders(allOrders);
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

  const groupedOrders = ORDER_STATUSES.reduce((acc, status) => {
    acc[status] = orders.filter((o) => o.status === status);
    return acc;
  }, {} as Record<string, any[]>);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const orderId = active.id as number;
    let newStatus: string | null = null;

    // Case 1: Dropped directly on a column (over.id is a status string)
    if (ORDER_STATUSES.includes(over.id as any)) {
      newStatus = over.id as string;
    }
    // Case 2: Dropped on a card – find the status of that card's column
    else {
      const targetCard = orders.find((o) => o.id === over.id);
      if (targetCard) {
        newStatus = targetCard.status;
      }
    }

    if (!newStatus) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === newStatus) return;

    // ✅ Prevent double‑click reorder within same column (no API call needed)
    if (order.status === newStatus) return;

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      )
    );

    setUpdatingOrderId(orderId);
    try {
      await updateOrder(orderId, { status: newStatus });
      toast.success(`Order ${order.order_number} moved to ${STATUS_LABELS[newStatus]}`);
      await fetchOrders(); // re‑fetch to sync with backend
    } catch (error: any) {
      // Rollback on error
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: order.status } : o
        )
      );
      const msg = error?.detail || error?.message || "Failed to update status.";
      toast.error(msg);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Navigate to order detail on card click
  const handleCardClick = (orderId: number) => {
    router.push(`/dashboard/orders/${orderId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 snap-x">
        {ORDER_STATUSES.map((status) => (
          <div key={status} className="snap-start" style={{ minHeight: "400px" }}>
            <KanbanColumn status={status} orders={groupedOrders[status] || []} />
          </div>
        ))}
      </div>
    </DndContext>
  );
}