"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getTable, updateTable } from "@/lib/tableApi"; // ✅ Use your API
import { useAuth } from "@/context/AuthContext";
import { useCanManage } from "@/hooks/useCanManage";
import { ArrowLeft, Loader2, Users, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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

export default function TableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const canManage = useCanManage();

  const [table, setTable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");

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

  useEffect(() => {
    fetchTable();
  }, [id]);

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
        <p className="text-slate-400">Table not found.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[table.status] || "bg-slate-500/20 text-slate-400";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/dashboard/tables">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Tables
        </Button>
      </Link>

      <Card className="bg-white/[0.03] border-white/[0.08]">
        <CardHeader className="border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Users className="h-6 w-6 text-indigo-400" />
              </div>
              <CardTitle className="text-2xl text-white">
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
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <span className="text-sm text-slate-300">Change Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Table Number</span>
                <span className="text-white font-medium">{table.table_number}</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm text-slate-400">Capacity</span>
                <span className="text-white font-medium">{table.capacity} Persons</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm text-slate-400">Area</span>
                <span className="text-white font-medium">{table.area || "—"}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Assigned Server</span>
                <span className="text-white font-medium">
                  {table.server?.username || "Unassigned"}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm text-slate-400">Status</span>
                <Badge className={cn("text-xs", statusColor)}>
                  {STATUS_LABELS[table.status] || table.status}
                </Badge>
              </div>
              {table.occupied_since && (
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-sm text-slate-400">Occupied Since</span>
                  <span className="text-white font-medium">
                    {new Date(table.occupied_since).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}