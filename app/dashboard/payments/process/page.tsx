"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { CheckCircle, Clock, Loader2, AlertCircle, DollarSign, LayoutGrid, List, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Payment {
  id: number;
  order: number;
  order_number?: string;
  order_numbers?: string[];
  amount: string;
  payment_method: string;
  status: "COMPLETED" | "PENDING" | "FAILED" | string;
  customer_name: string;
  created_at: string;
  table_number?: number;
}

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "💰 Cash" },
  { value: "QR", label: "📱 QR" },
];

export default function ProcessPaymentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethods, setSelectedMethods] = useState<Record<number, string>>({});
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [showConfirm, setShowConfirm] = useState<{ id: number; newStatus: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ─── Fetch pending payments ──────────────────────────────────────────
  const fetchPendingPayments = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/orders/payments/?status=PENDING", {}, true);
      const data = await res.json();
      if (!res.ok) throw data;
      const paymentsData = data.results || data || [];
      setPayments(paymentsData);
      const initialMethods: Record<number, string> = {};
      paymentsData.forEach((p: Payment) => {
        initialMethods[p.id] = p.payment_method;
      });
      setSelectedMethods(initialMethods);
    } catch (error: any) {
      toast.error(error?.detail || "Failed to load pending payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  // ─── Handle method change ────────────────────────────────────────────
  const handleMethodChange = (paymentId: number, newMethod: string) => {
    setSelectedMethods((prev) => ({ ...prev, [paymentId]: newMethod }));
  };

  // ─── Open confirmation modal ─────────────────────────────────────────
  const handleStatusClick = (paymentId: number, newStatus: string) => {
    setShowConfirm({ id: paymentId, newStatus });
  };

  // ─── Update payment ──────────────────────────────────────────────────
  const handleConfirmUpdate = async () => {
    if (!showConfirm) return;
    const { id, newStatus } = showConfirm;
    const newMethod = selectedMethods[id] || payments.find(p => p.id === id)?.payment_method || "CASH";
    setConfirmLoading(true);
    try {
      const res = await apiFetch(
        `/api/orders/payments/${id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: newStatus,
            payment_method: newMethod,
          }),
        },
        true,
      );
      const data = await res.json();
      if (!res.ok) throw data;
      toast.success(`Payment ${newStatus.toLowerCase()} successfully!`);
      setShowConfirm(null);
      fetchPendingPayments(); // refresh list
    } catch (error: any) {
      toast.error(error?.detail || "Failed to update payment.");
    } finally {
      setConfirmLoading(false);
    }
  };

  // ─── Helper to format date & time ────────────────────────────────────
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-indigo-400" /> Process Payment
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/payments")}
            className="gap-2"
          >
            <DollarSign className="h-4 w-4" />
            All Payments
          </Button>
          <div className="flex gap-1 border border-border rounded-md p-1 bg-background">
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className="gap-1"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "cards" ? "default" : "ghost"}
              onClick={() => setViewMode("cards")}
              className="gap-1"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          <div className="flex justify-center">
            <CheckCircle className="h-12 w-12 text-emerald-400/50" />
          </div>
          <p className="text-muted-foreground mt-3">No pending payments to process.</p>
          <p className="text-sm text-muted-foreground">
            All bills are either completed or there are no pending ones.
          </p>
        </div>
      ) : (
        <>
          {/* ─── List View ─── */}
          {viewMode === "list" && (
            <Card className="border-border bg-muted/30 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
  {payment.order_numbers?.length && payment.order_numbers.length > 1 
    ? payment.order_numbers.join(', ')
    : `#${payment.order_number || payment.order}`}
</TableCell>
                        <TableCell>
                          {payment.table_number ? `Table ${payment.table_number}` : "—"}
                        </TableCell>
                        <TableCell>{payment.customer_name || "Guest"}</TableCell>
                        <TableCell>${parseFloat(payment.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <select
                            value={selectedMethods[payment.id] || payment.payment_method}
                            onChange={(e) => handleMethodChange(payment.id, e.target.value)}
                            className="px-2 py-1 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          >
                            {PAYMENT_METHOD_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(payment.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleStatusClick(payment.id, "COMPLETED")}
                              className="gap-1"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusClick(payment.id, "FAILED")}
                              className="gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              Failed
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* ─── Card View ─── */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {payments.map((payment) => (
                <Card key={payment.id} className="bg-muted/30 border-border hover:bg-muted/30 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-foreground flex justify-between items-center">
                      <span>#{payment.order_number || payment.order}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {payment.table_number ? `Table ${payment.table_number}` : "—"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="text-foreground font-medium">{payment.customer_name || "Guest"}</span>
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="text-indigo-400 font-bold">${parseFloat(payment.amount).toFixed(2)}</span>
                      <span className="text-muted-foreground">Created:</span>
                      <span className="text-foreground text-xs">{formatDateTime(payment.created_at)}</span>
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Payment Method</label>
                      <select
                        value={selectedMethods[payment.id] || payment.payment_method}
                        onChange={(e) => handleMethodChange(payment.id, e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        {PAYMENT_METHOD_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleStatusClick(payment.id, "COMPLETED")}
                        className="flex-1 gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusClick(payment.id, "FAILED")}
                        className="flex-1 gap-1"
                      >
                        <XCircle className="h-3 w-3" />
                        Failed
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Confirmation Modal ─── */}
      <Modal
        isOpen={!!showConfirm}
        onClose={() => !confirmLoading && setShowConfirm(null)}
        title={showConfirm?.newStatus === "COMPLETED" ? "Confirm Completion" : "Confirm Failure"}
        icon={
          showConfirm?.newStatus === "COMPLETED" ? (
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          ) : (
            <XCircle className="h-8 w-8 text-red-500" />
          )
        }
        description={
          <div className="space-y-3 text-left">
            <p>
              You are about to mark payment{" "}
              <strong>#{payments.find(p => p.id === showConfirm?.id)?.order_number}</strong> as{" "}
              <strong>{showConfirm?.newStatus}</strong>.
            </p>
            <div className="bg-muted/30 p-3 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold">
                  ${parseFloat(payments.find(p => p.id === showConfirm?.id)?.amount || "0").toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-medium">
                  {PAYMENT_METHOD_OPTIONS.find(
                    (opt) => opt.value === selectedMethods[showConfirm?.id || 0]
                  )?.label || "CASH"}
                </span>
              </div>
              <div className="flex justify-between mt-1 border-t border-border pt-1">
                <span className="text-muted-foreground">New Status:</span>
                <span
                  className={cn(
                    "font-bold",
                    showConfirm?.newStatus === "COMPLETED" ? "text-emerald-500" : "text-red-500"
                  )}
                >
                  {showConfirm?.newStatus}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This action will finalize the payment and cannot be undone.
            </p>
          </div>
        }
        confirmText={confirmLoading ? "Updating..." : `Confirm ${showConfirm?.newStatus || "Update"}`}
        cancelText="Cancel"
        onConfirm={handleConfirmUpdate}
        onCancel={() => !confirmLoading && setShowConfirm(null)}
        variant={showConfirm?.newStatus === "COMPLETED" ? "default" : "danger"}
        confirmDisabled={confirmLoading}
      />
    </div>
  );
}