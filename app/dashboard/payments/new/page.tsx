"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Printer,
  ShoppingBag,
  User,
  DollarSign,
  Table as TableIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { listOrders, getOrder, listTables } from "@/lib/ordersApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { InvoicePreview } from "@/components/InvoicePreview";

interface FormData {
  table: string;
  order: string;
  amount: string;
  customer_name: string;
  payment_method: string;
  status: string;
  transaction_id: string;
}

export default function NewPaymentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      table: "",
      order: "",
      amount: "",
      customer_name: "",
      payment_method: "CASH",
      status: "COMPLETED",
      transaction_id: "",
    },
  });

  const selectedTableId = watch("table");
  const selectedOrderId = watch("order");
  const customerName = watch("customer_name");
  const paymentMethod = watch("payment_method");
  const amount = watch("amount");

  // ─── 1. Fetch occupied tables ──────────────────────────────────────────
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const data = await listTables();
        const allTables = Array.isArray(data) ? data : [];
        const occupiedTables = allTables.filter(
          (t: any) => t.status === "OCCUPIED" || t.status === "PAYMENT_PENDING"
        );
        setTables(occupiedTables);
      } catch (error) {
        console.error("Failed to fetch tables:", error);
        toast.error("Failed to load tables.");
      } finally {
        setLoadingTables(false);
      }
    };
    fetchTables();
  }, []);

  // ─── 2. When table selected → fetch its orders ──────────────────────
  useEffect(() => {
    if (selectedTableId) {
      const fetchOrdersForTable = async () => {
        setLoadingOrders(true);
        try {
          const tableId = parseInt(selectedTableId, 10);
          if (isNaN(tableId)) {
            toast.error("Invalid table selected.");
            return;
          }

          console.log(`🔍 Fetching orders for table ID: ${tableId}`);
          const data = await listOrders(tableId);
          console.log("📦 Orders response:", data);

          const tableOrders = Array.isArray(data) ? data : [];
          console.log("📋 All orders for this table:", tableOrders);

          // Filter only READY or DELIVERED
          const eligibleOrders = tableOrders.filter(
            (o: any) => o.status === "READY" || o.status === "DELIVERED"
          );
          console.log("✅ Eligible orders (READY/DELIVERED):", eligibleOrders);

          setOrders(eligibleOrders);

          if (eligibleOrders.length > 0) {
            const firstOrder = eligibleOrders[0];
            setValue("order", String(firstOrder.id));
            setSelectedOrder(firstOrder);
          } else {
            setOrders([]);
            setSelectedOrder(null);
            setValue("order", "");
          }
        } catch (error) {
          console.error("❌ Failed to fetch orders:", error);
          toast.error("Failed to load orders.");
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrdersForTable();
    } else {
      setOrders([]);
      setSelectedOrder(null);
      setValue("order", "");
    }
  }, [selectedTableId, setValue]);

  // ─── 3. When order selected → fetch full details ────────────────────
  useEffect(() => {
    if (selectedOrderId) {
      const fetchOrderDetails = async () => {
        try {
          const order = await getOrder(selectedOrderId);
          setSelectedOrder(order);
        } catch (error) {
          console.error("Failed to fetch order details:", error);
          toast.error("Failed to load order details.");
        }
      };
      fetchOrderDetails();
    }
  }, [selectedOrderId]);

  // ─── 4. Compute table totals ────────────────────────────────────────────
  const combinedItems = orders.flatMap((order: any) => order.items || []);
  const subtotal = orders.reduce(
    (sum, order) => sum + parseFloat(order.total_amount || 0),
    0
  );
  const tax = subtotal * 0.08;
  const grandTotal = subtotal + tax;

  // ─── 5. Auto‑fill amount when table changes ──────────────────────────
  useEffect(() => {
    if (selectedTableId && orders.length > 0) {
      setValue("amount", grandTotal.toFixed(2));
    } else {
      setValue("amount", "");
    }
  }, [selectedTableId, orders, grandTotal, setValue]);

  // ─── 6. Submit payment ──────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    if (!data.order) {
      toast.error("Please select an order to pay.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order: parseInt(data.order, 10),
        amount: parseFloat(data.amount),
        subtotal: subtotal,
        tax: tax,
        payment_method: data.payment_method,
        status: data.status,
        transaction_id: data.transaction_id || undefined,
        branch: user?.branch?.id || 1,
        customer_name: data.customer_name || "Guest",
      };
      const res = await apiFetch(
        "/api/orders/payments/",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        true
      );
      const json = await res.json();
      if (!res.ok) throw json;
      toast.success("Payment processed successfully!");
      router.push("/dashboard/payments");
    } catch (error: any) {
      const messages = Object.values(error).flat().join(" ");
      toast.error(messages || "Failed to process payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const cashierName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || "Cashier";

  const selectedTable = tables.find((t) => t.id === parseInt(selectedTableId));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Link href="/dashboard/payments">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Payments
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── LEFT PANEL ─── */}
        <div className="space-y-4">
          <Card className="bg-white/[0.03] border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-400" />
                Process Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Table */}
                <div>
                  <label htmlFor="table" className="block text-sm font-medium text-slate-300 mb-1">
                    Select Table (Occupied) *
                  </label>
                  <select
                    id="table"
                    {...register("table", { required: "Please select a table" })}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Select a table —</option>
                    {loadingTables ? (
                      <option disabled>Loading tables...</option>
                    ) : tables.length === 0 ? (
                      <option disabled>No occupied tables</option>
                    ) : (
                      tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          Table {table.table_number} — {table.status.replace("_", " ")}
                        </option>
                      ))
                    )}
                  </select>
                  {errors.table && <p className="text-sm text-red-400 mt-1">{errors.table.message}</p>}
                </div>

                {/* Order */}
                {orders.length > 0 ? (
                  <div>
                    <label htmlFor="order" className="block text-sm font-medium text-slate-300 mb-1">
                      Select Order to Pay *
                    </label>
                    <select
                      id="order"
                      {...register("order", { required: "Please select an order" })}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {orders.map((order) => (
                        <option key={order.id} value={order.id}>
                          #{order.order_number} — ${order.total_amount}
                        </option>
                      ))}
                    </select>
                    {errors.order && <p className="text-sm text-red-400 mt-1">{errors.order.message}</p>}
                  </div>
                ) : selectedTableId ? (
                  <div className="text-sm text-amber-400 bg-amber-500/10 p-3 rounded-lg">
                    No eligible orders (READY/DELIVERED) found for this table.
                  </div>
                ) : null}

                {/* Customer Name */}
                <div>
                  <label htmlFor="customer_name" className="block text-sm font-medium text-slate-300 mb-1">
                    Customer Name
                  </label>
                  <input
                    id="customer_name"
                    type="text"
                    placeholder="Guest"
                    {...register("customer_name")}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Grand Total */}
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-1">
                    Grand Total ($) *
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    {...register("amount", { required: "Amount is required", min: 0.01 })}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.amount && <p className="text-sm text-red-400 mt-1">{errors.amount.message}</p>}
                </div>

                {/* Payment Method */}
                <div>
                  <label htmlFor="payment_method" className="block text-sm font-medium text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    id="payment_method"
                    {...register("payment_method", { required: "Method is required" })}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="QR">QR</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-slate-300 mb-1">
                    Status *
                  </label>
                  <select
                    id="status"
                    {...register("status")}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>

                {/* Transaction ID */}
                <div>
                  <label htmlFor="transaction_id" className="block text-sm font-medium text-slate-300 mb-1">
                    Transaction ID (optional)
                  </label>
                  <input
                    id="transaction_id"
                    type="text"
                    placeholder="e.g. QR-12345"
                    {...register("transaction_id")}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Cashier */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cashier</label>
                  <div className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white">
                    {cashierName}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !selectedOrderId}
                  className="w-full gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                  {submitting ? "Processing..." : "Process Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* ─── Table Items ─── */}
          {orders.length > 0 && (
            <Card className="bg-white/[0.03] border-white/[0.08]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TableIcon className="h-5 w-5 text-indigo-400" />
                  Table {selectedTable?.table_number} — All Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {combinedItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center border-b border-white/5 py-2 text-sm"
                        >
                          <span className="text-white">
                            {item.quantity}× {item.product_name}
                          </span>
                          <span className="text-slate-300">
                            ${(parseFloat(item.price_at_order) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 text-white font-bold">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-white">
                      <span>Tax (8%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 text-white font-bold text-lg border-t border-white/5">
                      <span>Grand Total</span>
                      <span>${grandTotal.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── RIGHT PANEL: Invoice Preview ─── */}
        <div className="space-y-4">
          <Card className="bg-white/[0.03] border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-indigo-400" />
                  Invoice Preview
                </span>
                {selectedTable && combinedItems.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => handlePrint()}>
                    <Printer className="h-4 w-4" /> Download PDF
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={invoiceRef}>
                <InvoicePreview
                  tableNumber={selectedTable?.table_number || null}
                  items={combinedItems}
                  subtotal={subtotal}
                  tax={tax}
                  grandTotal={grandTotal}
                  customerName={customerName || "Guest"}
                  cashierName={cashierName}
                  paymentMethod={paymentMethod}
                  orderNumber={selectedOrder?.order_number}
                  date={selectedOrder?.created_at}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}