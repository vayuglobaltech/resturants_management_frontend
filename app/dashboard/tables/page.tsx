"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listTables } from "@/lib/ordersApi";
import { Plus, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const TABLE_STATUSES = ["AVAILABLE", "OCCUPIED", "RESERVED", "OUT_OF_SERVICE"];

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  OCCUPIED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  RESERVED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  OUT_OF_SERVICE: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function TablesPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const data = await listTables();
        setTables(data.results || data || []);
      } catch (error) {
        console.error("Failed to fetch tables:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading tables...</p>
        </div>
      </div>
    );
  }

  // Group tables by status
  const tablesByStatus = TABLE_STATUSES.map((status) => ({
    status,
    items: tables.filter((t) => t.status === status),
  }));

  // Include any extra statuses that might not be in our predefined list
  const otherStatuses = Array.from(new Set(tables.map((t) => t.status).filter((s) => !TABLE_STATUSES.includes(s))));
  otherStatuses.forEach((status) => {
    tablesByStatus.push({
      status,
      items: tables.filter((t) => t.status === status),
    });
  });

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TableIcon className="h-6 w-6 text-indigo-400" /> All Tables
        </h1>
        <Link href="/dashboard/tables/add">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Table
          </Button>
        </Link>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl flex-shrink-0">
          <p className="text-slate-400">No tables found.</p>
          <Link href="/dashboard/tables/add" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">
            Add a new table →
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 overflow-x-auto pb-4 gap-6 snap-x">
          {tablesByStatus.filter(col => col.items.length > 0 || TABLE_STATUSES.includes(col.status)).map((column) => (
            <div key={column.status} className="w-[320px] flex-shrink-0 flex flex-col snap-start">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full", 
                    statusColors[column.status] ? statusColors[column.status].split(" ")[0].replace("/10", "") : "bg-slate-500"
                  )} />
                  {column.status.replace(/_/g, " ")}
                </h3>
                <span className="text-xs font-medium text-slate-400 bg-white/[0.05] px-2 py-0.5 rounded-full">
                  {column.items.length}
                </span>
              </div>
              
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 pb-2">
                {column.items.map((table) => (
                  <Link href={`/dashboard/tables/${table.id}`} key={table.id} className="block">
                    <Card className="hover:bg-white/[0.06] transition-colors group cursor-pointer border-white/[0.05]">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                          table.status === "OCCUPIED" 
                            ? "bg-amber-500/10 text-amber-400" 
                            : table.status === "AVAILABLE"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-slate-500/10 text-slate-400"
                        )}>
                          <span className="text-lg font-bold">{table.table_number || table.name || table.id}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                            Table {table.table_number || table.name || table.id}
                          </h3>
                          {table.capacity && (
                            <p className="text-xs text-slate-400 mt-1">
                              Capacity: {table.capacity} persons
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                
                {column.items.length === 0 && (
                  <div className="border border-dashed border-white/5 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500">No {column.status.toLowerCase().replace(/_/g, " ")} tables</p>
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
