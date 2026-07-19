"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  DndContext,
  closestCorners,
  DragEndEvent,
  DragOverlay,
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
import { updateOrder } from "@/lib/ordersApi";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useCanModifyOrders } from "@/hooks/usePermissions";

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
  DELIVERED: "bg-slate-500/20 text-muted-foreground border-slate-500/30",
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

// ✅ Helper function to safely get user role as string
const getUserRoleString = (role: any): string => {
  if (!role) return '';
  if (typeof role === 'string') return role;
  if (typeof role === 'object' && 'name' in role) {
    return String(role.name);
  }
  return '';
};

// ─── Overlay Order Card ──────────────────────────────────────────────
function OverlayOrderCard({ order }: { order: any }) {
  const statusColor = STATUS_COLORS[order.status] || "bg-slate-500/20 text-muted-foreground";
  return (
    <div className="p-4 rounded-xl border-2 border-indigo-500/50 bg-card shadow-2xl shadow-indigo-500/30 rotate-1 scale-105 w-[280px] pointer-events-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">{order.order_number}</h4>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Table {order.table_number_display || order.table_number}</span>
            {order.user_name && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">{order.user_name}</span>
              </>
            )}
          </div>
        </div>
        <Badge className={cn("shrink-0 text-xs font-medium", statusColor)}>
          {STATUS_LABELS[order.status] || order.status}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          {order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}
        </span>
        <span className="text-sm font-bold text-foreground">
          ${parseFloat(order.total_amount || 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── Order Card ──────────────────────────────────────────────────────
interface OrderCardProps {
  order: any;
  onClick?: (id: number) => void;
}

function OrderCard({ order, onClick }: OrderCardProps) {
  const isPaid = order.status === "PAID";
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id, disabled: isPaid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const statusColor = STATUS_COLORS[order.status] || "bg-slate-500/20 text-muted-foreground";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isPaid ? {} : { ...attributes, ...listeners })}
      onClick={() => onClick?.(order.id)}
      className={cn(
        "group p-4 rounded-xl border border-border bg-card hover:border-indigo-500/30 hover:shadow-md hover:shadow-indigo-500/10 transition-all duration-200 cursor-grab active:cursor-grabbing touch-none select-none will-change-transform"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">{order.order_number}</h4>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Table {order.table_number_display || order.table_number}</span>
            {order.user_name && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">{order.user_name}</span>
              </>
            )}
          </div>
        </div>
        <Badge className={cn("shrink-0 text-xs font-medium", statusColor)}>
          {STATUS_LABELS[order.status] || order.status}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          {order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}
        </span>
        <span className="text-sm font-bold text-foreground">
          ${parseFloat(order.total_amount || 0).toFixed(2)}
        </span>
      </div>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-muted-foreground">↕</span>
      </div>
    </div>
  );
}

// ─── Kanban Column ──────────────────────────────────────────────────
interface KanbanColumnProps {
  status: string;
  orders: any[];
  onCardClick?: (id: number) => void;
}

function KanbanColumn({ status, orders, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[260px] max-w-[320px] bg-muted/30 rounded-xl p-4 border border-border transition-colors",
        isOver && "border-indigo-500/50 bg-indigo-500/5 shadow-lg shadow-indigo-500/20"
      )}
      style={{ minHeight: "400px" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{STATUS_LABELS[status]}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {orders.length}
        </span>
      </div>
      <div className="space-y-2">
        <SortableContext
          items={orders.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onClick={onCardClick} />
          ))}
        </SortableContext>
        {orders.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">
            Drop orders here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Board ──────────────────────────────────────────────────────
interface KanbanBoardProps {
  orders: any[];
  onOrderUpdate?: () => void;
}

export function KanbanBoard({ orders, onOrderUpdate }: KanbanBoardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const canModify = useCanModifyOrders();
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

  // Sensors
  // Unconditionally create all sensors
const pointerSensor = useSensor(PointerSensor, {
  activationConstraint: { distance: 5 },
});

const touchSensor = useSensor(TouchSensor, {
  activationConstraint: {
    delay: 1500,
    tolerance: 80,
  },
});

const keyboardSensor = useSensor(KeyboardSensor);

// Build the array of sensors to use
const activeSensors = isTouchDevice
  ? [touchSensor, keyboardSensor]
  : [pointerSensor, keyboardSensor];

// Spread the array into separate arguments
const sensors = useSensors(...activeSensors);

  const groupedOrders = useMemo(() => {
    return ORDER_STATUSES.reduce((acc, status) => {
      acc[status] = orders.filter((o) => o.status === status);
      return acc;
    }, {} as Record<string, any[]>);
  }, [orders]);

  const handleDragStart = useCallback((event: any) => {
    const order = orders.find((o) => o.id === event.active.id);
    if (order) {
      setActiveOrder(order);
      setActiveId(event.active.id);
    }
  }, [orders]);

  const handleDragCancel = useCallback(() => {
    setActiveOrder(null);
    setActiveId(null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveOrder(null);
      setActiveId(null);
      return;
    }

    const orderId = active.id as number;
    let newStatus: string | null = null;

    if (ORDER_STATUSES.includes(over.id as any)) {
      newStatus = over.id as string;
    } else {
      const targetCard = orders.find((o) => o.id === over.id);
      if (targetCard) newStatus = targetCard.status;
    }

    if (!newStatus) {
      setActiveOrder(null);
      setActiveId(null);
      return;
    }

    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === newStatus) {
      setActiveOrder(null);
      setActiveId(null);
      return;
    }

    // ✅ FIXED: Use the helper to get role as string
    const roleString = getUserRoleString(user?.role);
    if (newStatus === "PAID") {
      const allowedRoles = ["admin", "cashier"];
      if (!roleString || !allowedRoles.includes(roleString.toLowerCase())) {
        toast.error("Only Cashier or Admin can mark an order as PAID.");
        setActiveOrder(null);
        setActiveId(null);
        return;
      }
    }

    setUpdatingOrderId(orderId);
    try {
      await updateOrder(orderId, { status: newStatus });
      toast.success(`Order ${order.order_number} moved to ${STATUS_LABELS[newStatus]}`);
      onOrderUpdate?.();
    } catch (error: any) {
      const msg = error?.detail || error?.message || "Failed to update status.";
      toast.error(msg);
    } finally {
      setUpdatingOrderId(null);
      setActiveOrder(null);
      setActiveId(null);
    }
  }, [orders, user, onOrderUpdate]);

  const handleCardClick = useCallback((orderId: number) => {
    router.push(`/dashboard/orders/${orderId}`);
  }, [router]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 snap-x">
        {ORDER_STATUSES.map((status) => (
          <div key={status} className="snap-start" style={{ minHeight: "400px" }}>
            <KanbanColumn
              status={status}
              orders={groupedOrders[status] || []}
              onCardClick={handleCardClick}
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeId && activeOrder ? <OverlayOrderCard order={activeOrder} /> : null}
      </DragOverlay>
    </DndContext>
  );
}