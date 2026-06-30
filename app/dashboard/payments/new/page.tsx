"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api"; // ← changed
import { listOrders } from "@/lib/ordersApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface FormData {
  order: string;
  amount: string;
  payment_method: string;
  status: string;
  transaction_id: string;
}

export default function NewPaymentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      order: "",
      amount: "",
      payment_method: "CASH",
      status: "COMPLETED",
      transaction_id: "",
    },
  });

  const selectedOrderId = watch("order");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await listOrders();
        const allOrders = data.results || data || [];
        setOrders(allOrders);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        toast.error("Failed to load orders.");
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find((o) => o.id === parseInt(selectedOrderId));
      if (order && order.total_amount) {
        setValue("amount", parseFloat(order.total_amount).toFixed(2));
      }
    }
  }, [selectedOrderId, orders, setValue]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const payload = {
        order: parseInt(data.order),
        amount: parseFloat(data.amount),
        payment_method: data.payment_method,
        status: data.status,
        transaction_id: data.transaction_id || undefined,
        branch: user?.branch?.id || 1,
      };
      // ← changed to apiFetch
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link href="/dashboard/payments">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Payments
        </Button>
      </Link>

      <Card className="bg-white/[0.03] border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-400" />
            Process Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="order" className="block text-sm font-medium text-slate-300 mb-1">
                Order *
              </label>
              <select
                id="order"
                {...register("order", { required: "Order is required" })}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select an order</option>
                {loadingOrders ? (
                  <option disabled>Loading orders...</option>
                ) : (
                  orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      #{order.order_number} - Table {order.table_number || "N/A"} - ${order.total_amount}
                    </option>
                  ))
                )}
              </select>
              {errors.order && <p className="text-sm text-red-400 mt-1">{errors.order.message}</p>}
            </div>

            <Input
              label="Amount *"
              id="amount"
              type="number"
              step="0.01"
              {...register("amount", { required: "Amount is required", min: 0.01 })}
              error={errors.amount?.message}
            />

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

            <Input
              label="Transaction ID"
              id="transaction_id"
              {...register("transaction_id")}
            />

            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {submitting ? "Processing..." : "Process Payment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}