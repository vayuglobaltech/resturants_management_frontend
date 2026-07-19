"use client";

import Link from "next/link";
import { STATUS_COLORS, STATUS_LABELS } from "./TablesKanban"; // or import from constants

interface TableGridCardProps {
  table: {
    id: number;
    table_number: string;
    area?: string;
    capacity: number;
    status: keyof typeof STATUS_LABELS;
  };
}

export function TableGridCard({ table }: TableGridCardProps) {
  const status = table.status || "AVAILABLE";
  const colorClass = STATUS_COLORS[status] || "bg-gray-400";

  return (
    <Link href={`/dashboard/tables/${table.id}`} className="block">
      <div
        className={`relative rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200`}
      >
        {/* Status colour strip */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-xl ${colorClass}`}
        />

        <div className="mt-2">
          <p className="text-lg font-bold text-foreground">
            {table.table_number}
          </p>
          {table.area && (
            <p className="text-sm text-muted-foreground">{table.area}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {table.capacity} seats
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${colorClass}`} />
            <span className="text-xs font-medium text-foreground">
              {STATUS_LABELS[status]}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}