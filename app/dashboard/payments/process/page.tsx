"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { CheckCircle, Clock, Loader2, AlertCircle, DollarSign, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

interface Payment {
  id: number;
  order: number;
  order_number?: string;
  amount: string;
  payment_method: string;
  status: "COMPLETED" | "PENDING" | "FAILED" | string;
  customer_name: string;
  created_at: string;
  table_number?: number;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "⏳ Pending" },
  { value: "COMPLETED", label: "✅ Completed" },
  { value: "FAILED", label: "❌ Failed" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "💰 Cash" },
  { value: "CARD", label: "💳 Card" },
  { value: "ONLINE", label: "📱 Online" },
  { value: "QR", label: "📱 QR" },
];

export default function ProcessPaymentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState<Record<number, string>>({});
  const [selectedMethods, setSelectedMethods] = useState<Record<number, string>>({});
  const [showConfirm, setShowConfirm] = useState<{ id: number; newStatus: string; newMethod: string } | null>(null);
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
      // Initialize selected statuses and methods to current values
      const initialStatuses: Record<number, string> = {};
      const initialMethods: Record<number, string> = {};
      paymentsData.forEach((p: Payment) => {
        initialStatuses[p.id] = p.status;
        initialMethods[p.id] = p.payment_method;
      });
      setSelectedStatuses(initialStatuses);
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

  // ─── Handle changes ──────────────────────────────────────────────────
  const handleStatusChange = (paymentId: number, newStatus: string) => {
    setSelectedStatuses((prev) => ({ ...prev, [paymentId]: newStatus }));
  };

  const handleMethodChange = (paymentId: number, newMethod: string) => {
    setSelectedMethods((prev) => ({ ...prev, [paymentId]: newMethod }));
  };

  // ─── Open confirmation modal ─────────────────────────────────────────
  const handleUpdateClick = (paymentId: number) => {
    const newStatus = selectedStatuses[paymentId];
    const newMethod = selectedMethods[paymentId];
    if (!newStatus || !newMethod) return;
    setShowConfirm({ id: paymentId, newStatus, newMethod });
  };

  // ─── Update payment ──────────────────────────────────────────────────
  const handleConfirmUpdate = async () => {
    if (!showConfirm) return;
    const { id, newStatus, newMethod } = showConfirm;
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
      toast.success(`Payment updated to ${newStatus} with ${newMethod}!`);
      setShowConfirm(null);
      fetchPendingPayments(); // refresh list
    } catch (error: any) {
      toast.error(error?.detail || "Failed to update payment.");
    } finally {
      setConfirmLoading(false);
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Process Payment</h1>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/payments")}
          className="gap-2"
        >
          <DollarSign className="h-4 w-4" />
          All Payments
        </Button>
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
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        #{payment.order_number || payment.order}
                      </TableCell>
                      <TableCell>
                        {payment.table_number ? `Table ${payment.table_number}` : "—"}
                      </TableCell>
                      <TableCell>{payment.customer_name || "Guest"}</TableCell>
                      <TableCell>${parseFloat(payment.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            payment.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : payment.status === "PENDING"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto">
                            {/* Payment Method dropdown */}
                            <select
                              value={selectedMethods[payment.id] || payment.payment_method}
                              onChange={(e) => handleMethodChange(payment.id, e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full sm:w-auto"
                            >
                              {PAYMENT_METHOD_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {/* Status dropdown */}
                            <select
                              value={selectedStatuses[payment.id] || payment.status}
                              onChange={(e) => handleStatusChange(payment.id, e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full sm:w-auto"
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Update button */}
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleUpdateClick(payment.id)}
                            disabled={
                              selectedStatuses[payment.id] === payment.status &&
                              selectedMethods[payment.id] === payment.payment_method
                            }
                            className="whitespace-nowrap w-full sm:w-auto"
                          >
                            Update
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!showConfirm}
        onClose={() => !confirmLoading && setShowConfirm(null)}
        title="Confirm Update"
        icon={<CheckCircle className="h-8 w-8 text-indigo-500" />}
        description={
          <div className="space-y-3 text-left">
            <p>
              You are about to update the payment for bill{" "}
              <strong>#{payments.find(p => p.id === showConfirm?.id)?.order_number}</strong>.
            </p>
            <div className="bg-muted/30 p-3 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Status:</span>
                <span className="font-medium">
                  {payments.find(p => p.id === showConfirm?.id)?.status}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">New Status:</span>
                <span className="font-bold text-indigo-600">{showConfirm?.newStatus}</span>
              </div>
              <div className="flex justify-between mt-1 border-t border-border pt-1">
                <span className="text-muted-foreground">Current Method:</span>
                <span className="font-medium">
                  {payments.find(p => p.id === showConfirm?.id)?.payment_method}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">New Method:</span>
                <span className="font-bold text-indigo-600">{showConfirm?.newMethod}</span>
              </div>
              <div className="flex justify-between mt-1 border-t border-border pt-1">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold">
                  ${parseFloat(payments.find(p => p.id === showConfirm?.id)?.amount || "0").toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This action will update both status and payment method permanently.
            </p>
          </div>
        }
        confirmText={confirmLoading ? "Updating..." : "Confirm Update"}
        cancelText="Cancel"
        onConfirm={handleConfirmUpdate}
        onCancel={() => !confirmLoading && setShowConfirm(null)}
        variant="default"
        confirmDisabled={confirmLoading}
      />
    </div>
  );
}