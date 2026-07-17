"use client";

import { useEffect, useState, useRef } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { getOrder } from "@/lib/ordersApi";
import { InvoicePreview } from "@/components/InvoicePreview";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowLeft, Download, Printer } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PaymentDetail {
  id: number;
  order: number;
  order_number: string;
  amount: string;
  payment_method: string;
  status: string;
  created_at: string;
  customer_name?: string;
  table_number?: number;
  order_ids?: number[];
  order_numbers?: string[];
}

function combineOrderItems(orders: any[]) {
  const itemMap = new Map();

  orders.forEach((order) => {
    (order.items || []).forEach((item: any) => {
      const productId = item.product;
      if (!productId) return;
      const qty = item.quantity || 1;
      const price = item.price_at_order || 0;
      const name = item.product_name || "Unknown";

      if (itemMap.has(productId)) {
        const existing = itemMap.get(productId)!;
        existing.quantity += qty;
        existing.total_price = existing.quantity * existing.price_at_order;
      } else {
        itemMap.set(productId, {
          product_id: productId,
          product_name: name,
          quantity: qty,
          price_at_order: price,
          total_price: qty * price,
        });
      }
    });
  });

  return Array.from(itemMap.values());
}

export default function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [combinedItems, setCombinedItems] = useState<any[]>([]);
  const [combinedTotal, setCombinedTotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [allDiscounts, setAllDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isPrintReady, setIsPrintReady] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const paymentRes = await apiFetch(
          `/api/orders/payments/${id}/`,
          {},
          true,
        );
        const paymentData = await paymentRes.json();
        if (!paymentRes.ok) throw paymentData;
        setPayment(paymentData);

        let orderIds: number[] = [];
        if (paymentData.order_ids && paymentData.order_ids.length > 0) {
          orderIds = paymentData.order_ids;
        } else if (paymentData.order) {
          orderIds = [paymentData.order];
        }

        const orderPromises = orderIds.map((orderId: number) =>
          getOrder(orderId),
        );
        const fetchedOrders = await Promise.all(orderPromises);
        setOrders(fetchedOrders);

        // Combine items for display
        const combined = combineOrderItems(fetchedOrders);
        setCombinedItems(combined);

        // ✅ Calculate total using discounted order.total_amount
        const total = fetchedOrders.reduce(
          (sum, order) => sum + parseFloat(order.total_amount || 0),
          0,
        );
        setCombinedTotal(total);

        // ✅ Extract discounts from all orders
        const discounts = fetchedOrders.flatMap(
          (order) => order.discounts || [],
        );
        setAllDiscounts(discounts);
        const discountSum = discounts.reduce(
          (sum, d) => sum + parseFloat(d.amount || 0),
          0,
        );
        setTotalDiscount(discountSum);
      } catch (error) {
        console.error("Failed to load receipt:", error);
        toast.error("Could not load payment details.");
        router.push("/dashboard/payments");
      } finally {
        setLoading(false);
        setTimeout(() => setIsPrintReady(true), 300);
      }
    };
    fetchData();
  }, [id, router]);

  const handleDownloadPDF = async () => {
    const element = invoiceRef.current;
    if (!element) {
      toast.error("Invoice content not ready.");
      return;
    }
    try {
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`receipt-${payment?.order_number || id}.pdf`);
      toast.success("PDF downloaded!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF.");
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!payment || orders.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Payment not found.</p>
        <Link href="/dashboard/payments">
          <Button variant="ghost" className="mt-4 gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Payments
          </Button>
        </Link>
      </div>
    );
  }

  const combinedOrderNumbers = orders.map((o) => o.order_number).join(", ");
  const cashierName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || "Cashier";

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 print:py-0 print:space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/payments">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Payments
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={!isPrintReady}
            className="gap-1"
          >
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            disabled={!isPrintReady}
            className="gap-1"
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-border print:shadow-none print:border-none print:p-0">
        <div ref={invoiceRef} id="invoice-content" className="print:bg-white">
          <InvoicePreview
            tableNumber={payment.table_number || null}
            items={combinedItems}
            subtotal={combinedTotal + totalDiscount} // subtotal before discount
            grandTotal={combinedTotal}
            customerName={payment.customer_name || "Guest"}
            cashierName={cashierName}
            paymentMethod={payment.payment_method}
            orderNumber={combinedOrderNumbers || payment.order_number}
            date={payment.created_at}
            discounts={allDiscounts}
            totalDiscount={totalDiscount}
          />
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground print:hidden">
        Status: <span className="font-medium">{payment.status}</span>
        {" • "}
        Payment ID: #{payment.id}
      </div>
    </div>
  );
}
