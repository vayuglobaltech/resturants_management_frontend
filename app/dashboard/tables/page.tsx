"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TableGridView } from "@/components/tables/TableGridView";
import { listTables } from "@/lib/tableApi";
import { Button } from "@/components/ui/Button";
import { Plus, Loader2 } from "lucide-react";
import { useCanManage } from "@/hooks/useCanManage";
import toast from "react-hot-toast";

export default function TablesPage() {
  const router = useRouter();
  const canManage = useCanManage();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Fetch tables ──────────────────────────────────────────────
  const fetchTables = async () => {
    try {
      const data = await listTables();
      const allTables = data.results || data || [];
      setTables(allTables);
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      toast.error("Could not load tables.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // ─── Click handler ─────────────────────────────────────────────
  const handleCardClick = (id: number) => {
    router.push(`/dashboard/tables/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-20">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Tables</h1>
        <div className="flex items-center gap-3">
          {canManage && (
            <Link href="/dashboard/tables/add">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Table
              </Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Tap a table to view details
          </span>
        </div>
      </div>

      {/* ─── Grid ────────────────────────────────────────────────── */}
      <TableGridView tables={tables} onCardClick={handleCardClick} />
    </div>
  );
}