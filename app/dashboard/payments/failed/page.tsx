"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, RefreshCw, CheckCircle, XCircle, Table as TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface FailedPayment {
  id: string;
  order_number: string;
  amount: number;
  payment_method: string;
  status: "FAILED";
  created_at: string;
  table_number?: number | null;
}

export default function FailedPaymentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<FailedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchFailedPayments = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/orders/payments/?status=FAILED", {}, true);
      const data = await res.json();
      if (!res.ok) throw data;
      setPayments(data.results || data || []);
    } catch (error: any) {
      toast.error(error?.detail || "Failed to load failed payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailedPayments();
  }, []);

  const handleComplete = async (paymentId: string) => {
    setProcessingId(paymentId);
    try {
      const res = await apiFetch(
        `/api/orders/payments/${paymentId}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "COMPLETED" }),
        },
        true,
      );
      if (!res.ok) {
        const err = await res.json();
        throw err;
      }
      toast.success("Payment marked as completed!");
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    } catch (error: any) {
      toast.error(error?.detail || "Failed to update payment.");
    } finally {
      setProcessingId(null);
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
          <XCircle className="h-7 w-7 text-red-400" />
          Failed Payments
        </h1>
        <Button
          variant="outline"
          onClick={fetchFailedPayments}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/10">
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3 opacity-70" />
          <p className="text-muted-foreground">No failed payments found.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            All payments are completed or pending.
          </p>
        </div>
      ) : (
        <Card className="border-border bg-muted/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left">#</th>
                  <th className="px-6 py-4 text-left">Order</th>
                  <th className="px-6 py-4 text-left">Table</th>
                  <th className="px-6 py-4 text-left">Amount</th>
                  <th className="px-6 py-4 text-left">Method</th>
                  <th className="px-6 py-4 text-left">Date</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment, index) => (
                  <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      #{payment.order_number}
                    </td>
                    <td className="px-6 py-4">
                      {payment.table_number ? (
                        <span className="flex items-center gap-1.5">
                          <TableIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          Table {payment.table_number}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      ${Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 capitalize">
                      {payment.payment_method.toLowerCase()}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(payment.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleComplete(payment.id)}
                        disabled={processingId === payment.id}
                        className="gap-1"
                      >
                        {processingId === payment.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        {processingId === payment.id ? "Processing..." : "Complete"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}