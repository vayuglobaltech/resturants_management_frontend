"use client";

import { useEffect, useState, useRef, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Printer,
  User,
  DollarSign,
  Table as TableIcon,
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
  Building2,
  QrCode,
  Banknote,
  X,
  Download,
  ShoppingBag,
  PartyPopper,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
// import html2canvas from "html2canvas";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { apiFetch } from "@/lib/api";
import { listOrders, getOrder, listTables } from "@/lib/ordersApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { InvoicePreview } from "@/components/InvoicePreview";
import { Modal } from "@/components/ui/Modal"; // your existing modal
// import ReactToPrint from "react-to-print";

interface FormData {
  table: string;
  order: string;
  amount: string;
  customer_name: string;
  // payment_method: string;
  status: string;
  transaction_id: string;
}

export default function NewPaymentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const themeStyles = {
    "--page-bg": isDarkMode ? "#121110" : "#FAF8F5",
    "--page-surface": isDarkMode ? "#1C1A18" : "#FFFFFF",
    "--page-card": isDarkMode ? "#23211F" : "#F9F5EE",
    "--page-accent": isDarkMode ? "#D4A359" : "#B88E4C",
    "--page-accent-foreground": isDarkMode ? "#121110" : "#171412",
    "--page-text": isDarkMode ? "#F2EAE1" : "#1A1816",
    "--page-muted": isDarkMode ? "#A69E95" : "#5C564F",
    "--page-border": isDarkMode ? "rgba(212, 163, 89, 0.2)" : "rgba(184, 142, 76, 0.22)",
    "--page-soft": isDarkMode ? "rgba(212, 163, 89, 0.12)" : "rgba(184, 142, 76, 0.12)",
    "--page-overlay": isDarkMode ? "rgba(0, 0, 0, 0.78)" : "rgba(15, 23, 42, 0.6)",
  } as CSSProperties;

  // ─── Role-based route guard ─────────────────────────────────────────
  // Managers/admins should NOT access Process Payment — only cashiers can.
  const rawRole = user?.role ?? user?.name ?? "";
  const userRole = String(
    typeof rawRole === "object" && "name" in rawRole ? rawRole.name : rawRole,
  ).toUpperCase();
  const isManager = ["MANAGER", "BRANCH_MANAGER", "ADMIN"].includes(userRole);

  useEffect(() => {
    if (isManager) {
      toast.error("You don't have permission to process payments.");
      router.replace("/dashboard/payments");
    }
  }, [isManager, router]);

  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [showBillSplash, setShowBillSplash] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const splashRef = useRef<HTMLDivElement>(null);
  // const [isPrintReady, setIsPrintReady] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const searchParams = useSearchParams();
  const preSelectedTable = searchParams.get("table");
  const preSelectedStatus = searchParams.get("status") || "PENDING";
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [eligibleOrders, setEligibleOrders] = useState<any[]>([]);
  const [combinedItems, setCombinedItems] = useState<any[]>([]);
  const [combinedTotal, setCombinedTotal] = useState(0);
  const [masterOrderId, setMasterOrderId] = useState<number | null>(null);

  // ─── Block rendering for unauthorized roles ─────────────────────────
  if (isManager) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      table: "",
      order: "",
      amount: "",
      customer_name: "",
      // payment_method: "CASH",
      status: "COMPLETED",
      transaction_id: "",
    },
  });

  const selectedTableIdForm = watch("table");
  // const selectedOrderId = watch("order");
  const customerName = watch("customer_name");
  // const paymentMethod = watch("payment_method");

  const handleDownloadPDF = async () => {
    console.log("📄 PDF button clicked");

    await new Promise((resolve) => setTimeout(resolve, 300));

    const element =
      invoiceRef.current || document.getElementById("invoice-content");
    if (!element) {
      toast.error("Invoice content not ready. Please try again.");
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

      // ─── Use combined order numbers ──────────────────────────────
      let filename = "receipt";
      if (eligibleOrders.length > 0) {
        const orderNumbers = eligibleOrders
          .map((o) => o.order_number)
          .join("_");
        filename = `invoice-${orderNumbers}`;
      }
      pdf.save(`${filename}.pdf`);
      toast.success("Invoice downloaded!");
    } catch (error) {
      console.error("❌ PDF generation failed:", error);
      toast.error("Failed to generate PDF.");
    }
  };
  // ─── 1. Fetch occupied tables ──────────────────────────────────────────
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const data = await listTables();
        const allTables = Array.isArray(data) ? data : [];
        // ✅ Show ALL active tables (is_active = true)
        const activeTables = allTables.filter(
          (t: any) => t.status === "OCCUPIED",
        );
        setTables(activeTables);
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
  // ─── 2. When table selected → fetch all its orders ──────────────────────
  useEffect(() => {
    if (selectedTableIdForm) {
      const fetchOrdersForTable = async () => {
        setLoadingOrders(true);
        try {
          const tableId = parseInt(selectedTableIdForm, 10);
          if (isNaN(tableId)) {
            toast.error("Invalid table selected.");
            return;
          }

          const data = await listOrders(tableId);
          const tableOrders = Array.isArray(data) ? data : [];
          console.log("📦 All orders for table:", tableOrders);

          // ─── Active orders = not PAID or CANCELLED ──────────────────
          const activeOrders = tableOrders.filter(
            (o: any) =>
              !["PAID", "CANCELLED"].includes(o.status?.toUpperCase()),
          );
          console.log("📦 Active orders:", activeOrders);

          const hasActiveOrder = activeOrders.length > 0;
          setHasActiveOrder(hasActiveOrder);

          // ─── Eligible for payment = READY or DELIVERED ─────────────
          const eligibleOrders = activeOrders.filter(
            (o: any) =>
              // o.status?.toUpperCase() === "READY" ||
              o.status?.toUpperCase() === "DELIVERED" && !o.has_payment, // ✅ exclude already paid orders
          );
          console.log("📦 Eligible orders (READY/DELIVERED):", eligibleOrders);

          setOrders(eligibleOrders);
          setShowCreateOrder(eligibleOrders.length === 0 && hasActiveOrder);

          // ─── If eligible orders exist, combine them ────────────────────
          // ─── If eligible orders exist, combine them ────────────────────
          if (eligibleOrders.length > 0) {
            // Store all eligible orders
            setEligibleOrders(eligibleOrders);
            // Combine items
            const combined = combineOrderItems(eligibleOrders);
            setCombinedItems(combined);
            const total = eligibleOrders.reduce(
              (sum, order) => sum + parseFloat(order.total_amount || 0),
              0,
            );
            setCombinedTotal(total);
            setValue("amount", total.toFixed(2));
            // Use the first order as master for API
            setMasterOrderId(eligibleOrders[0].id);
            // Pre-fill customer name from the first order
            if (eligibleOrders[0].customer_name) {
              setValue("customer_name", eligibleOrders[0].customer_name);
            }
          } else {
            setEligibleOrders([]);
            setCombinedItems([]);
            setCombinedTotal(0);
            setMasterOrderId(null);
            setValue("amount", "");
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
      setEligibleOrders([]);
      setCombinedItems([]);
      setCombinedTotal(0);
      setMasterOrderId(null);
      setValue("order", "");
      setShowCreateOrder(false);
      setHasActiveOrder(false);
    }
  }, [selectedTableIdForm, setValue]);

  // ─── Helper: combine items from multiple orders ──────────────────────────
  const combineOrderItems = (orders: any[]) => {
    const itemMap = new Map<
      number,
      {
        product_id: number;
        product_name: string;
        quantity: number;
        price_at_order: number;
        total_price: number;
      }
    >();

    orders.forEach((order) => {
      (order.items || []).forEach((item: any) => {
        // ✅ Use `product` field (the ID) instead of `product_id`
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

    const result = Array.from(itemMap.values());
    console.log("✅ Combined items:", result);
    return result;
  };
  // ─── 3. When order selected → fetch full details ────────────────────
  // useEffect(() => {
  //   if (selectedOrderId) {
  //     const fetchOrderDetails = async () => {
  //       try {
  //         const order = await getOrder(selectedOrderId);
  //         setSelectedOrder(order);
  //       } catch (error) {
  //         console.error("Failed to fetch order details:", error);
  //         toast.error("Failed to load order details.");
  //       }
  //     };
  //     fetchOrderDetails();
  //   }
  // }, [selectedOrderId]);

  // ─── 4. Compute table totals ────────────────────────────────────────────
  // We now use combinedTotal from state instead of selectedOrder
  const subtotal = combinedTotal;
  const grandTotal = combinedTotal; // or subtotal + tax - discount if needed

  // ─── Total discount from selected order ──────────────────────────────────
  // We no longer have a single selectedOrder; discounts are handled elsewhere
  // For combined bills, we can sum discounts from all orders (optional)
  // ─── Compute discounts from all eligible orders ──────────────────────────
  const totalDiscountFromOrders = eligibleOrders.reduce<number>(
    (sum: number, order: any) =>
      sum + (order.discounts || []).reduce<number>((s: number, d: any) => s + Number(d.amount), 0),
    0,
  );

  // ─── 5. Auto‑fill amount when table changes ──────────────────────────
  useEffect(() => {
    if (selectedTableIdForm && combinedTotal > 0) {
      setValue("amount", combinedTotal.toFixed(2));
    } else {
      setValue("amount", "");
    }
  }, [selectedTableIdForm, combinedTotal, setValue]);

  // ─── 6. Submit payment ──────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    if (!masterOrderId) {
      toast.error("No eligible order found for this table.");
      return;
    }

    const allOrderIds = eligibleOrders.map((o) => o.id); // all order IDs

    // Prepare payload with master order
    const payload = {
      order: masterOrderId, // use master order for the API
      order_ids: allOrderIds, // ✅ send all order IDs
      amount: parseFloat(data.amount) || combinedTotal,
      subtotal: parseFloat(combinedTotal.toFixed(2)),
      // payment_method: "CASH",
      status: "PENDING",
      transaction_id: data.transaction_id || undefined,
      branch: branchId,
      customer_name: data.customer_name || "Guest",
      // We'll also store other order IDs to update later
      other_order_ids: eligibleOrders
        .filter((o) => o.id !== masterOrderId)
        .map((o) => o.id),
    };

    setPendingPayload(payload);
    setShowConfirmModal(true);
  };

  // ─── Confirm handler ─────────────────────────────────────────────────────
  const handleConfirmPayment = async () => {
    if (!pendingPayload) return;
    setConfirmLoading(true);
    try {
      const finalPayload = {
        ...pendingPayload,
        status: "PENDING", // always pending
      };

      const res = await apiFetch(
        "/api/orders/payments/",
        {
          method: "POST",
          body: JSON.stringify(finalPayload),
        },
        true,
      );
      const json = await res.json();
      if (!res.ok) throw json;

      // ✅ Success – show invoice preview
      setPaymentSuccess(true);
      setShowBillSplash(true);
      setShowConfirmModal(false);
      toast.success("Bill generated successfully! Payment is pending.");

      // (Optional) store the created payment ID if needed
      // setCreatedPaymentId(json.id);
    } catch (error: any) {
      const messages = Object.values(error).flat().join(" ");
      toast.error(messages || "Failed to generate bill.");
    } finally {
      setConfirmLoading(false);
    }
  };

  // useEffect(() => {
  //   if (showBillSplash && paymentSuccess) {
  //     // Wait for DOM update
  //     const timer = setTimeout(() => setIsPrintReady(true), 200);
  //     return () => clearTimeout(timer);
  //   }
  //   setIsPrintReady(false);
  // }, [showBillSplash, paymentSuccess]);

  const handleTableClick = (tableId: number) => {
    setSelectedTableId(String(tableId));
    setValue("table", String(tableId));
    setShowBillSplash(false);
    setPaymentSuccess(false);
  };

  const closeBillSplash = () => {
    setShowBillSplash(false);
    setPaymentSuccess(false);
    setTimeout(() => {
      router.push("/dashboard/payments");
    }, 300);
  };

  const cashierName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || "Cashier";

  const branchName =
    typeof user?.branch === "object" && user?.branch !== null && "name" in user.branch
      ? (user.branch as { name?: string }).name
      : undefined;

  const branchId =
    typeof user?.branch === "object" && user?.branch !== null && "id" in user.branch
      ? Number((user.branch as { id?: number }).id)
      : 1;

  const selectedTable = tables.find(
    (t) => t.id === parseInt(selectedTableIdForm),
  );

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      OCCUPIED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      PAYMENT_PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
    const icons = {
      OCCUPIED: <CheckCircle className="h-3 w-3" />,
      PAYMENT_PENDING: <Clock className="h-3 w-3" />,
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.OCCUPIED}`}
      >
        {icons[status as keyof typeof icons] || icons.OCCUPIED}
        {status?.replace("_", " ")}
      </span>
    );
  };

  // Table Card Component
  const TableCard = ({ table }: { table: any }) => {
    const isSelected = selectedTableIdForm === String(table.id);
    const isOccupied = table.status === "OCCUPIED";

    return (
      <div
        onClick={() => handleTableClick(table.id)}
        className={`
          relative cursor-pointer rounded-xl p-4 transition-all duration-300
          ${
            isSelected
              ? "border-2 scale-105"
              : "border hover:scale-105"
          }
        `}
        style={{
          backgroundColor: isSelected ? "var(--page-soft)" : "var(--page-surface)",
          borderColor: isSelected ? "var(--page-accent)" : "var(--page-border)",
          boxShadow: isSelected ? "0 12px 30px rgba(184, 142, 76, 0.18)" : undefined,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`
              p-2 rounded-lg
              ${isOccupied ? "bg-emerald-500/20" : "bg-amber-500/20"}
            `}
            >
              <TableIcon
                className={`
                h-5 w-5
                ${isOccupied ? "text-emerald-400" : "text-amber-400"}
              `}
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: "var(--page-text)" }}>
                Table {table.table_number}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={table.status} />
                {isSelected && (
                  <span className="text-xs animate-pulse" style={{ color: "var(--page-accent)" }}>
                    ● Selected
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOccupied && (
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--page-soft)", color: "var(--page-muted)" }}>
                Active
              </span>
            )}
          </div>
        </div>

        {/* Status indicator dot */}
        <div
          className={`
          absolute top-3 right-3 w-2 h-2 rounded-full
          ${isOccupied ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"}
        `}
        />
      </div>
    );
  };

  // Compute total discount from all eligible orders
  const totalDiscountValue = eligibleOrders.reduce<number>(
    (sum: number, order: any) =>
      sum + (order.discounts || []).reduce<number>((s: number, d: any) => s + Number(d.amount), 0),
    0,
  );
  const subtotalBeforeDiscount = combinedTotal + totalDiscountValue;
  return (
    <div
      className="min-h-screen p-6 print:bg-white print:p-0 print:block"
      style={{
        ...themeStyles,
        backgroundColor: "var(--page-bg)",
        color: "var(--page-text)",
        backgroundImage: isDarkMode
          ? "linear-gradient(135deg, #121110 0%, #1C1A18 100%)"
          : "linear-gradient(135deg, #FAF8F5 0%, #F4ECE2 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto space-y-6 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/payments">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 transition-all"
              style={{ color: "var(--page-muted)" }}
            >
              <ArrowLeft className="h-4 w-4" /> Back to Payments
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-border">
              <Building2 className="h-4 w-4" style={{ color: "var(--page-accent)" }} />
              <span className="text-sm" style={{ color: "var(--page-muted)" }}>
                {branchName || "Main Branch"}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-border">
              <User className="h-4 w-4" style={{ color: "var(--page-accent)" }} />
              <span className="text-sm" style={{ color: "var(--page-muted)" }}>{cashierName}</span>
            </div>
          </div>
        </div>

        {/* ─── Main Content: Tables Left | Payment Details Right ─── */}
        {!showBillSplash && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ─── LEFT: Tables Grid (4 columns) ─── */}
            <div className="lg:col-span-4">
              <div className="sticky top-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--page-text)" }}>
                  <TableIcon className="h-5 w-5" style={{ color: "var(--page-accent)" }} />
                  Active Tables
                  <span className="text-sm font-normal ml-2" style={{ color: "var(--page-muted)" }}>
                    ({tables.length} active)
                  </span>
                </h2>
                {loadingTables ? (
                  <div className="flex items-center justify-center py-8 bg-background rounded-xl border border-border">
                    <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                    <span className="ml-3 text-muted-foreground">
                      Loading tables...
                    </span>
                  </div>
                ) : tables.length === 0 ? (
                  <div className="bg-background rounded-xl border border-border p-8 text-center">
                    <div className="text-muted-foreground">
                      <TableIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No active tables available</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tables.map((table) => (
                      <TableCard key={table.id} table={table} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ─── RIGHT: Payment Details (8 columns) ─── */}
            <div className="lg:col-span-8">
              {selectedTableIdForm ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payment Form */}
                  <div className="space-y-6">
                    <Card className="bg-muted/30 border-border backdrop-blur-sm shadow-xl">
                      <CardHeader className="border-b border-border pb-4">
                        <CardTitle className="text-foreground flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--page-soft)" }}>
                            <CreditCard className="h-5 w-5" style={{ color: "var(--page-accent)" }} />
                          </div>
                          <span className="text-lg font-semibold">
                            Payment Details
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <form
                          onSubmit={handleSubmit(onSubmit)}
                          className="space-y-4"
                        >
                          {/* Hidden table field */}
                          <input type="hidden" {...register("table")} />

                          {/* Table Info */}
                          <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                            <span className="text-muted-foreground">Table</span>
                            <span className="text-foreground font-semibold">
                              Table {selectedTable?.table_number}
                              <span className="ml-2">
                                <StatusBadge status={selectedTable?.status} />
                              </span>
                            </span>
                          </div>

                          {/* ─── Combined Order Summary ─── */}
                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                              Order Summary
                            </label>

                            {loadingOrders ? (
                              <div className="flex items-center justify-center py-3 bg-background rounded-lg border border-border">
                                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--page-accent)" }} />
                                <span className="ml-2 text-sm text-muted-foreground">
                                  Loading orders...
                                </span>
                              </div>
                            ) : eligibleOrders.length > 0 ? (
                              <div className="space-y-2 bg-background rounded-lg border border-border p-3">
                                <div className="text-xs text-muted-foreground">
                                  Combining {eligibleOrders.length} order
                                  {eligibleOrders.length > 1 ? "s" : ""} for
                                  this table
                                </div>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {combinedItems.map((item) => (
                                    <div
                                      key={item.product_id}
                                      className="flex justify-between items-center text-sm"
                                    >
                                      <span>
                                        <span className="font-medium">
                                          {item.quantity}×
                                        </span>{" "}
                                        {item.product_name}
                                      </span>
                                      <span className="text-muted-foreground">
                                        ${item.total_price.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {/* Subtotal before discount */}
                                <div className="flex justify-between text-sm text-muted-foreground pt-1">
                                  <span>Subtotal</span>
                                  <span>
                                    ${subtotalBeforeDiscount.toFixed(2)}
                                  </span>
                                </div>

                                {/* Discount if any */}
                                {totalDiscountFromOrders > 0 && (
                                  <div className="flex justify-between text-sm text-emerald-400">
                                    <span>Discount</span>
                                    <span>
                                      -${totalDiscountFromOrders.toFixed(2)}
                                    </span>
                                  </div>
                                )}

                                {/* Grand total (discounted) */}
                                <div className="flex justify-between pt-2 border-t border-border font-bold text-foreground">
                                  <span>Total</span>
                                  <span style={{ color: "var(--page-accent)" }}>
                                    ${combinedTotal.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ) : hasActiveOrder ? (
                              // ─── Order exists but not ready for payment ──────────────────────
                              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm">
                                  An order exists for this table, but it is not
                                  ready for payment yet.
                                  <br />
                                  <span className="text-xs text-slate-400">
                                    Please wait until it is marked as READY or
                                    DELIVERED.
                                  </span>
                                </span>
                              </div>
                            ) : showCreateOrder ? (
                              // ─── No order at all → cashier can create one ────────────────────
                              <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-dashed" style={{ backgroundColor: "var(--page-soft)", borderColor: "var(--page-border)" }}>
                                <p className="text-sm mb-3" style={{ color: "var(--page-muted)" }}>
                                  No orders found for this table.
                                </p>
                                <Button
                                  variant="outline"
                                  className="gap-2"
                                  onClick={() => {
                                    if (selectedTableIdForm) {
                                      router.push(
                                        `/dashboard/orders/new?table=${selectedTableIdForm}&status=READY`,
                                      );
                                    } else {
                                      toast.error("No table selected.");
                                    }
                                  }}
                                >
                                  <Plus className="h-4 w-4" /> Create Order for
                                  this Table
                                </Button>
                              </div>
                            ) : (
                              // ─── Fallback ──────────────────────────────────────────────────────
                              <div className="flex items-center gap-2 p-3 rounded-lg border" style={{ backgroundColor: "var(--page-soft)", borderColor: "var(--page-border)", color: "var(--page-accent)" }}>
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm">
                                  Unable to determine order status.
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Customer Name */}
                          <div>
                            <label
                              htmlFor="customer_name"
                              className="block text-sm font-medium text-muted-foreground mb-1.5"
                            >
                              Customer Name
                            </label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <input
                                id="customer_name"
                                type="text"
                                placeholder="Guest"
                                {...register("customer_name")}
                                className="w-full pl-10 rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                              />
                            </div>
                          </div>

                          {/* Grand Total */}
                          <div>
                            <label
                              htmlFor="amount"
                              className="block text-sm font-medium text-muted-foreground mb-1.5"
                            >
                              Grand Total{" "}
                              <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <input
                                id="amount"
                                type="number"
                                step="0.01"
                                {...register("amount", {
                                  required: "Amount is required",
                                  min: 0.01,
                                })}
                                className="w-full pl-10 rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                              />
                            </div>
                            {errors.amount && (
                              <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" />{" "}
                                {errors.amount.message}
                              </p>
                            )}
                          </div>

                          {/* Payment Method & Status Row */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* <div>
                              <label
                                htmlFor="payment_method"
                                className="block text-sm font-medium text-muted-foreground mb-1.5"
                              >
                                Payment Method{" "}
                                <span className="text-red-400">*</span>
                              </label>
                              <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                  {paymentMethod === "CASH" ? (
                                    <Banknote className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <QrCode className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <select
                                  id="payment_method"
                                  {...register("payment_method", {
                                    required: "Method is required",
                                  })}
                                  className="w-full pl-10 rounded-lg border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer hover:bg-muted"
                                >
                                  <option value="CASH" className="bg-slate-800">
                                    💰 Cash
                                  </option>
                                  <option value="QR" className="bg-slate-800">
                                    📱 QR
                                  </option>
                                </select>
                              </div>
                            </div> */}
                            {/* <div>
                              <label
                                htmlFor="status"
                                className="block text-sm font-medium text-muted-foreground mb-1.5"
                              >
                                Status <span className="text-red-400">*</span>
                              </label>
                              <select
                                id="status"
                                {...register("status")}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer hover:bg-muted"
                              >
                                <option
                                  value="COMPLETED"
                                  className="bg-slate-800"
                                >
                                  ✅ Completed
                                </option>
                                <option
                                  value="PENDING"
                                  className="bg-slate-800"
                                >
                                  ⏳ Pending
                                </option>
                                <option value="FAILED" className="bg-slate-800">
                                  ❌ Failed
                                </option>
                              </select>
                            </div> */}
                          </div>

                          {/* Transaction ID */}
                          <div>
                            <label
                              htmlFor="transaction_id"
                              className="block text-sm font-medium text-muted-foreground mb-1.5"
                            >
                              Transaction ID{" "}
                              <span className="text-muted-foreground text-xs">
                                (optional)
                              </span>
                            </label>
                            <input
                              id="transaction_id"
                              type="text"
                              placeholder="e.g. QR-12345"
                              {...register("transaction_id")}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                          </div>

                          {/* Submit Button */}
                          <Button
                            type="submit"
                            disabled={
                              submitting ||
                              !masterOrderId ||
                              combinedItems.length === 0
                            }
                            className="w-full gap-2 py-3 text-base font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg shadow-indigo-500/25"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-5 w-5" />
                                Create bill
                              </>
                            )}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </div>

                  {/* ─── Confirmation Modal ─────────────────────────────────────────── */}
                  <Modal
                    isOpen={showConfirmModal}
                    onClose={() => {
                      if (!confirmLoading) {
                        setShowConfirmModal(false);
                        setPendingPayload(null);
                      }
                    }}
                    title="Confirm Bill Generation"
                    icon={<Receipt className="h-8 w-8 text-indigo-500" />}
                    description={
                      <div className="space-y-2 text-left">
                        <p>You are about to generate a bill for this order.</p>
                        <div className="bg-muted/30 p-3 rounded-lg text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Order:
                            </span>
                            <span className="font-medium">
                              #{pendingPayload?.order}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-muted-foreground">
                              Customer:
                            </span>
                            <span className="font-medium">
                              {pendingPayload?.customer_name}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1 border-t border-border pt-1">
                            <span className="text-muted-foreground">
                              Total Amount:
                            </span>
                            <span className="font-bold text-indigo-600">
                              ${pendingPayload?.amount?.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This will create a pending payment. Complete the
                          payment in the "Process Payment" section.
                        </p>
                      </div>
                    }
                    confirmText={
                      confirmLoading ? "Generating..." : "Confirm & Generate"
                    }
                    cancelText="Cancel"
                    onConfirm={handleConfirmPayment}
                    onCancel={() => {
                      if (!confirmLoading) {
                        setShowConfirmModal(false);
                        setPendingPayload(null);
                      }
                    }}
                    variant="default"
                    confirmDisabled={confirmLoading}
                  />

                  {/* Order Items */}
                  <div className="space-y-6">
                    <Card className="bg-muted/30 border-border backdrop-blur-sm shadow-xl overflow-hidden">
                      <CardHeader className="border-b border-border pb-4">
                        <CardTitle className="text-foreground flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <ShoppingBag className="h-5 w-5 text-emerald-400" />
                          </div>
                          <span className="text-lg font-semibold">
                            Order Items
                          </span>
                          <span className="ml-auto text-sm text-muted-foreground">
                            {combinedItems.length} items
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        {loadingOrders ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--page-accent)" }} />
                          </div>
                        ) : orders.length > 0 ? (
                          <div className="space-y-4">
                            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                              {combinedItems.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between items-center p-3 bg-background rounded-lg border border-border hover:bg-muted transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium px-2.5 py-1 rounded" style={{ backgroundColor: "var(--page-soft)", color: "var(--page-text)" }}>
                                      {item.quantity}×
                                    </span>
                                    <span className="text-foreground">
                                      {item.product_name}
                                    </span>
                                  </div>
                                  <span className="text-muted-foreground font-medium">
                                    $
                                    {(
                                      parseFloat(item.price_at_order) *
                                      item.quantity
                                    ).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Totals */}
                            <div className="space-y-2 pt-8 mt-6 border-t border-border">
                              <div className="flex justify-between items-center text-muted-foreground text-sm">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-muted-foreground text-sm">
                                <span className="text-[12px]">
                                  (Including Tax)
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-2 text-foreground text-lg font-bold border-t border-border">
                                <span>Grand Total</span>
                                <span style={{ color: "var(--page-accent)" }}>
                                  ${grandTotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No items in this order</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px] bg-background rounded-xl border border-border">
                  <div className="text-center text-muted-foreground">
                    <TableIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium" style={{ color: "var(--page-muted)" }}>
                      Select a table to start
                    </p>
                    <p className="text-sm mt-1">
                      Choose an active table from the left panel
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── BILL SPLASH OVERLAY ─── */}
      {showBillSplash && paymentSuccess && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-lg print:static print:block print:bg-white print:p-0"
          style={{ backgroundColor: "var(--page-overlay)" }}
          onClick={closeBillSplash}
        >
          <div
            ref={splashRef}
            className="relative rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto animate-in slide-up duration-500 print:static print:shadow-none print:transform-none print:max-w-full print:max-h-none print:overflow-visible print:rounded-none"
            style={{ backgroundColor: "var(--page-surface)", border: "1px solid var(--page-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 p-5 rounded-t-2xl print:hidden" style={{ background: "linear-gradient(90deg, var(--page-accent), color-mix(in srgb, var(--page-accent) 80%, #ffffff 20%))" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-full animate-bounce">
                    <PartyPopper className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-bold text-xl">
                      Bill Generated! 🎉
                    </h3>
                    <p className="text-emerald-100 text-sm">
                      {eligibleOrders.length > 0
                        ? `Orders: ${eligibleOrders.map((o) => o.order_number).join(", ")}`
                        : "Transaction pending"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeBillSplash}
                  className="text-foreground/80 hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full"
                  title="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Invoice content */}
            <div className="p-6 print:p-0" style={{ backgroundColor: "var(--page-card)" }}>
              <div
                className="rounded-xl shadow-lg p-6 border-2 print:p-0 print:border-none print:shadow-none print:rounded-none"
                style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)" }}
                ref={invoiceRef}
                id="invoice-content"
              >
                <InvoicePreview
                  tableNumber={selectedTable?.table_number || null}
                  items={combinedItems}
                  subtotal={subtotalBeforeDiscount}
                  grandTotal={combinedTotal}
                  customerName={customerName || "Guest"}
                  cashierName={cashierName}
                  orderNumber={
                    eligibleOrders.length > 0
                      ? eligibleOrders[0].order_number
                      : "N/A"
                  }
                  date={new Date().toISOString()}
                  discounts={eligibleOrders.flatMap((o) => o.discounts || [])}
                  totalDiscount={totalDiscountValue} // or calculate combined discounts if needed
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="sticky bottom-0 p-5 rounded-b-2xl border-t no-print print:hidden" style={{ backgroundColor: "var(--page-surface)", borderColor: "var(--page-border)" }}>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-foreground shadow-lg shadow-indigo-500/25 px-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadPDF();
                  }}
                >
                  <Download className="h-4 w-4" />
                  Save as PDF
                </Button>

                <Button
                  className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 px-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.print();
                  }}
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>

                <Button
                  onClick={closeBillSplash}
                  variant="outline"
                  className="gap-2 px-6"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
              <div className="mt-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Payment is pending – complete it in the "Process Payment"
                  section.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        /* 1. SCROLLBAR: attach this to the parent wrapper */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.8);
        }

        /* 3. ANIMATIONS */
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-in {
          animation-fill-mode: both;
        }

        .slide-up {
          animation-name: slide-up;
          animation-duration: 0.4s;
          animation-timing-function: ease-out;
        }
      `}</style>
    </div>
  );
}
