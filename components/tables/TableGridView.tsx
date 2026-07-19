"use client";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  OCCUPIED: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
};

export const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
};

// ─── Grid View (Card Grid) ─────────────────────────────────────────
export function TableGridView({ tables, onCardClick }: { tables: any[]; onCardClick: (id: number) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {tables.map((table) => {
        const statusColor =
          STATUS_COLORS[table.status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
        const [bg, text, border] = statusColor.split(" ");
        return (
          <div
            key={table.id}
            onClick={() => onCardClick(table.id)}
            className={cn(
              "group relative rounded-xl border p-2 sm:p-4 shadow-sm",
              "hover:shadow-md active:scale-[0.98]",
              "transition-all duration-200 ease-out cursor-pointer",
              "flex flex-col items-center justify-center text-center",
              "h-20 sm:h-44 w-full",
              bg,
              border,
              "hover:border-indigo-500/50"
            )}
          >
            {/* ─── Table number ──────────────────────────── */}
            <span className="text-sm sm:text-2xl font-bold text-foreground/90 group-hover:text-foreground transition-colors">
              T{table.table_number}
            </span>

            {/* ─── Status badge ──────────────────────────── */}
            <span className={cn("text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1", text)}>
              {STATUS_LABELS[table.status] || table.status}
            </span>

            {/* ─── Extra details (hidden on mobile) ────── */}
            <div className="hidden sm:block">
              {table.area && (
                <span className="text-xs text-muted-foreground/70 mt-0.5 block">
                  {table.area}
                </span>
              )}
              <span className="text-xs text-muted-foreground/60 mt-1 block">
                {table.capacity} seats
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}