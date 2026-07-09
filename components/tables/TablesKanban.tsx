"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { listTables, updateTable } from "@/lib/tableApi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Table as TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const TABLE_STATUSES = ["AVAILABLE", "OCCUPIED", "RESERVED", "OUT_OF_SERVICE"];

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

// ─── Table Card ─────────────────────────────────────────────────────────

interface TableCardProps {
  table: any;
  onClick?: (id: number) => void;
}

function TableCard({ table, onClick }: TableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: table.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.3 : 1,
  };

  const statusColor = STATUS_COLORS[table.status] || "bg-slate-500/20 text-muted-foreground";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(table.id)}
      className={cn(
        "group p-4 rounded-xl border border-border bg-card hover:border-indigo-500/30 hover:shadow-md hover:shadow-indigo-500/10 transition-all duration-200 cursor-grab active:cursor-grabbing touch-none select-none"
      )}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-foreground font-medium text-sm">
          Table {table.table_number}
        </h4>
        <Badge className={cn("text-xs", statusColor)}>
          {STATUS_LABELS[table.status] || table.status}
        </Badge>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        <span>Capacity: {table.capacity}</span>
        {table.area && (
          <>
            <span className="text-muted-foreground">•</span>
            <span>{table.area}</span>
          </>
        )}
      </div>
      {table.server && (
        <div className="mt-1 text-xs text-muted-foreground">
          Server: {table.server.username}
        </div>
      )}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-muted-foreground">↕</span>
      </div>
    </div>
  );
}

// ─── Overlay Card (floating during drag) ──────────────────────────────

function OverlayTableCard({ table }: { table: any }) {
  const statusColor = STATUS_COLORS[table.status] || "bg-slate-500/20 text-muted-foreground";

  return (
    <div className="p-4 rounded-xl border-2 border-indigo-500/50 bg-card shadow-2xl shadow-indigo-500/30 rotate-1 scale-105 w-[280px] pointer-events-none">
      <div className="flex items-center justify-between">
        <h4 className="text-foreground font-medium text-sm">
          Table {table.table_number}
        </h4>
        <Badge className={cn("text-xs", statusColor)}>
          {STATUS_LABELS[table.status] || table.status}
        </Badge>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        <span>Capacity: {table.capacity}</span>
        {table.area && (
          <>
            <span className="text-muted-foreground">•</span>
            <span>{table.area}</span>
          </>
        )}
      </div>
      {table.server && (
        <div className="mt-1 text-xs text-muted-foreground">
          Server: {table.server.username}
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: string;
  tables: any[];
  onCardClick?: (id: number) => void;
}

function KanbanColumn({ status, tables, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[200px] bg-muted/30 rounded-xl p-3 border border-border transition-colors",
        isOver && "border-indigo-500/50 bg-indigo-500/5 shadow-lg shadow-indigo-500/20"
      )}
      style={{ minHeight: "300px" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          {STATUS_LABELS[status] || status}
        </h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {tables.length}
        </span>
      </div>
      <div className="space-y-2">
        <SortableContext
          items={tables.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tables.map((table) => (
            <TableCard key={table.id} table={table} onClick={onCardClick} />
          ))}
        </SortableContext>
        {tables.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
            Drop tables here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Board ─────────────────────────────────────────────────────────

interface TablesKanbanProps {
  onTableUpdate?: () => void;
}

export function TablesKanban({ onTableUpdate }: TablesKanbanProps) {
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTableId, setUpdatingTableId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeTable, setActiveTable] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const fetchTables = async () => {
    try {
      const data = await listTables();
      const allTables = data.results || data || [];
      setTables(allTables);
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      toast.error("Failed to load tables.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const groupedTables = TABLE_STATUSES.reduce((acc, status) => {
    acc[status] = tables.filter((t) => t.status === status);
    return acc;
  }, {} as Record<string, any[]>);

  const handleDragStart = (event: any) => {
    const table = tables.find((t) => t.id === event.active.id);
    if (table) {
      setActiveTable(table);
    }
    setActiveId(event.active.id);
  };

  const handleDragCancel = () => {
    setActiveTable(null);
    setActiveId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTable(null);
    setActiveId(null);

    const { active, over } = event;
    if (!over) return;

    const tableId = active.id as number;
    let newStatus: string | null = null;

    if (TABLE_STATUSES.includes(over.id as any)) {
      newStatus = over.id as string;
    } else {
      const targetTable = tables.find((t) => t.id === over.id);
      if (targetTable) newStatus = targetTable.status;
    }

    if (!newStatus) return;

    const table = tables.find((t) => t.id === tableId);
    if (!table || table.status === newStatus) return;

    // Optimistic update
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId ? { ...t, status: newStatus } : t
      )
    );

    setUpdatingTableId(tableId);
    try {
      await updateTable(tableId, { status: newStatus });
      toast.success(`Table moved to ${STATUS_LABELS[newStatus]}`);
      await fetchTables(); // Re‑fetch to sync
      onTableUpdate?.();
    } catch (error: any) {
      // Rollback
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId ? { ...t, status: table.status } : t
        )
      );
      toast.error(error?.detail || "Failed to update table status.");
    } finally {
      setUpdatingTableId(null);
    }
  };

  const handleCardClick = (tableId: number) => {
    router.push(`/dashboard/tables/${tableId}`);
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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 snap-x">
        {TABLE_STATUSES.map((status) => (
          <div key={status} className="snap-start" style={{ minHeight: "300px" }}>
            <KanbanColumn
              status={status}
              tables={groupedTables[status] || []}
              onCardClick={handleCardClick}
            />
          </div>
        ))}
      </div>

      {/* ─── Drag Overlay ────────────────────────────────────────────── */}
      <DragOverlay>
        {activeId && activeTable ? (
          <OverlayTableCard table={activeTable} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}