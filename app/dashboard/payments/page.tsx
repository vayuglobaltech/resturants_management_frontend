"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Loader2,
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPayments = async (pageNum: number = 1, search: string = "") => {
    setLoading(true);
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const res = await apiFetch(
        `/api/orders/payments/?page=${pageNum}&ordering=-created_at${searchParam}`,
        {},
        true,
      );
      const json = await res.json();
      if (!res.ok) throw json;

      const data = json.results || json || [];
      setPayments(data);
      setPage(pageNum);
      setTotalCount(json.count || data.length);
      setTotalPages(Math.ceil((json.count || data.length) / 10));
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      toast.error("Failed to load payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(1, searchTerm);
  }, []);

  const handleNext = () => {
    if (page < totalPages) fetchPayments(page + 1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments(1, searchTerm);
  };

  const handlePrev = () => {
    if (page > 1) fetchPayments(page - 1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "PENDING":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "FAILED":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-muted-foreground border-slate-500/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-indigo-400" />
          Payments
        </h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form
            onSubmit={handleSearch}
            className="flex flex-1 sm:flex-initial gap-2"
          >
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchPayments(page, searchTerm)}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground">No payments recorded yet.</p>
        </div>
      ) : (
        <>
          <Card className="border-border bg-muted/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-muted-foreground">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left">SN</th>
                    <th className="px-6 py-4 text-left">Order</th>
                    <th className="px-6 py-4 text-left">Amount</th>
                    <th className="px-6 py-4 text-left">Method</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-left">Date</th>
                    <th className="px-6 py-4 text-left">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {payments.map((payment, index) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        #{payment.order_number || payment.order}
                      </td>
                      <td className="px-6 py-4">
                        ${parseFloat(payment.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {payment.payment_method || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-block text-xs px-2.5 py-1 rounded-full border",
                            getStatusColor(payment.status),
                          )}
                        >
                          {payment.status || "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {payment.created_at
                          ? new Date(payment.created_at).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {payment.created_at
                          ? new Date(payment.created_at).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ─── Pagination Controls ─── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">
              Showing page {page} of {totalPages} · Total {totalCount} records
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={page <= 1}
                className="gap-1 text-foreground border-border hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={page >= totalPages}
                className="gap-1 text-foreground border-border hover:bg-muted"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
