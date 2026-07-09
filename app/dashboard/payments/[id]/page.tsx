"use client";

import { useEffect, useState, useRef } from "react";
import { use } from "react"; // 👈 import React.use
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
}

export default function PaymentReceiptPage({ 
  params 
}: { 
  params: Promise<{ id: string }>  // 👈 params is a Promise
}) {
  // 👇 Unwrap the params Promise using React.use()
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isPrintReady, setIsPrintReady] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch payment details
        const paymentRes = await apiFetch(`/api/orders/payments/${id}/`, {}, true);
        const paymentData = await paymentRes.json();
        if (!paymentRes.ok) throw paymentData;
        setPayment(paymentData);

        // 2. Fetch order details to get items
        if (paymentData.order) {
          const orderData = await getOrder(paymentData.order);
          setOrder(orderData);
        }
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

  if (!payment || !order) {
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

  const items = order.items || [];
  const subtotal = Number(order.total_amount) || 0;
  const totalDiscount = 0;
  const cashierName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username || "Cashier";

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 print:py-0 print:space-y-0">
      {/* ─── Toolbar ────────────────────────────────────────────────────── */}
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

      {/* ─── Invoice Content ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-border print:shadow-none print:border-none print:p-0">
        <div ref={invoiceRef} id="invoice-content" className="print:bg-white">
          <InvoicePreview
            tableNumber={payment.table_number || null}
            items={items}
            subtotal={subtotal}
            grandTotal={subtotal}
            customerName={payment.customer_name || "Guest"}
            cashierName={cashierName}
            paymentMethod={payment.payment_method}  
            orderNumber={payment.order_number}
            date={payment.created_at}
            discounts={[]}
            totalDiscount={totalDiscount}
          />
        </div>
      </div>

      {/* ─── Status badge ────────────────────────────────────────────────── */}
      <div className="text-center text-sm text-muted-foreground print:hidden">
        Status: <span className="font-medium">{payment.status}</span>
        {" • "}
        Payment ID: #{payment.id}
      </div>
    </div>
  );
}