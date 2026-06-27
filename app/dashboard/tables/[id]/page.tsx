"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTable } from "@/lib/ordersApi";
import { ArrowLeft, Users, CheckCircle2, ChevronRight, Hash, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function TableDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [table, setTable] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTable = async () => {
      try {
        const data = await getTable(unwrappedParams.id);
        setTable(data);
      } catch (error) {
        console.error("Failed to fetch table details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTable();
  }, [unwrappedParams.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading table details...</p>
        </div>
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

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    OCCUPIED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    RESERVED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    OUT_OF_SERVICE: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const statusColor = statusColors[table.status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/dashboard/tables" className="hover:text-white transition-colors">
            Tables
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-white font-medium">Table {table.table_number || table.name || table.id}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("px-3 py-1 text-xs font-semibold rounded-full border", statusColor)}>
            {table.status || "UNKNOWN"}
          </span>
          <Button variant="outline" className="gap-2">
            Update Status
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-white/[0.05] bg-white/[0.02]">
          <CardHeader className="pb-4 border-b border-white/[0.05]">
            <CardTitle className="text-lg">Table Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 flex items-center gap-2"><Hash className="h-4 w-4"/> Table Number</span>
              <span className="text-white font-medium">{table.table_number || table.name || table.id}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 flex items-center gap-2"><Users className="h-4 w-4"/> Capacity</span>
              <span className="text-white font-medium">{table.capacity || "N/A"} Persons</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 flex items-center gap-2"><MapPin className="h-4 w-4"/> Area</span>
              <span className="text-white font-medium">{table.area || "Main Hall"}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 flex items-center gap-2"><User className="h-4 w-4"/> Assigned Server</span>
              <span className="text-white font-medium">{table.server_name || "Unassigned"}</span>
            </div>
          </CardContent>
        </Card>

        {table.status === "OCCUPIED" && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-4 border-b border-amber-500/10">
              <CardTitle className="text-lg text-amber-400">Current Occupancy</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-amber-200/70">Occupied Since</span>
                <span className="text-amber-100">
                  {table.occupied_since 
                    ? new Date(table.occupied_since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : "Unknown"}
                </span>
              </div>
              <div className="pt-4 mt-2 border-t border-amber-500/10">
                <Link href="/dashboard/orders">
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white border-0">
                    View Active Order
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
