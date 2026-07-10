"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import  OrderSummary  from "@/components/orders/orderSummary";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  Table as TableIcon,
  Send,
  Loader2,
  Barcode,X,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { listTables } from "@/lib/ordersApi";
import { listMenuItems } from "@/lib/menuApi";
import { createOrder, getActiveDiscounts } from "@/lib/ordersApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ProtectedOrder } from "@/components/ProtectedOrder";
import { useSearchParams } from "next/navigation";

interface MenuItem {
  id: number;
  name: string;
  price: string;
  description: string;
  category_name: string;
  is_available: boolean;
  sku?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface Table {
  id: number;
  table_number: number;
  status: string;
}

interface FormData {
  table: string;
  special_instructions: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>("");
const [showSkuFilter, setShowSkuFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ─── Discount State ──────────────────────────────────────────────────────
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  // Add this with your other state declarations (around line 35)
const [cartSplash, setCartSplash] = useState(false);
// Added this state to track if cart is open or closed
const [isCartOpen, setIsCartOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      table: "",
      special_instructions: "",
    },
  });

  const selectedTableId = watch("table");
  const specialInstructions = watch("special_instructions");

  // Inside the component
  const searchParams = useSearchParams();
  const preSelectedTable = searchParams.get("table");
  const preSelectedStatus = searchParams.get("status") || "PENDING";

  useEffect(() => {
    if (preSelectedTable) {
      setValue("table", preSelectedTable);
    }
  }, [preSelectedTable, setValue]);

  // ─── Fetch Tables, Menu, and Discounts ──────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tablesData, menuData] = await Promise.all([
          listTables(),
          listMenuItems(),
        ]);
        setTables(tablesData.results || tablesData || []);
        setMenuItems(menuData.results || menuData || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Fetch active discounts (only if user can apply discounts)
    const fetchDiscounts = async () => {
      const roleName =
        typeof user?.role === "object" && user?.role !== null && "name" in user.role
          ? String(user.role.name)
          : typeof user?.role === "string"
            ? user.role
            : "";
      if (!roleName || !["admin", "branch_manager", "cashier"].includes(roleName))
        return;
      setLoadingDiscounts(true);
      try {
        const data = await getActiveDiscounts();
        setDiscounts(data);
      } catch (error) {
        console.error("Failed to fetch discounts:", error);
      } finally {
        setLoadingDiscounts(false);
      }
    };
    fetchDiscounts();
  }, []);

  // ─── Compute Cart Total ──────────────────────────────────────────────────
  const total = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0,
    );
  }, [cart]);

  // ─── Compute Discount Amount ────────────────────────────────────────────
  useEffect(() => {
    if (selectedDiscountId) {
      const discount = discounts.find(
        (d) => String(d.id) === selectedDiscountId,
      );
      if (discount) {
        let amount = 0;
        if (discount.type === "percentage") {
          amount = (discount.value / 100) * total;
        } else {
          amount = Math.min(discount.value, total);
        }
        setDiscountAmount(amount);
      } else {
        setDiscountAmount(0);
      }
    } else {
      setDiscountAmount(0);
    }
  }, [selectedDiscountId, total, discounts]);

  const grandTotal = total - discountAmount;

  // ─── Cart Operations ─────────────────────────────────────────────────────
  const addToCart = (item: MenuItem) => {
    setCartSplash(true);
    setTimeout(() => setCartSplash(false), 600);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  const handleSpecialInstructionsChange = (instructions: string) => {
    setValue("special_instructions", instructions);
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((i) => i.id !== id);
      }
      return prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i));
    });
  };

  const removeItem = (id: number) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const uniqueSkus = useMemo(() => { // ← ADD THIS
    const skus = menuItems
      .map(item => item.sku)
      .filter((sku): sku is string => !!sku);
    return [...new Set(skus)];
  }, [menuItems]);

  // ─── Filter Menu Items ──────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let filtered = menuItems;
    
    if (searchTerm.trim()) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
        if (selectedSku) {
      filtered = filtered.filter((item) =>
        item.sku?.toLowerCase() === selectedSku.toLowerCase(),
      );
    }
    
    return filtered;
  }, [menuItems, searchTerm, selectedSku]); 
  // ─── Submit Order ────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    if (!selectedTableId) {
      toast.error("Please select a table.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Please add at least one item.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        table: parseInt(selectedTableId),
        priority: false,
        special_instructions: data.special_instructions || "",
        items_data: cart.map((item) => ({
          menu_item: item.id,
          quantity: item.quantity,
        })),
        discount_id: selectedDiscountId ? parseInt(selectedDiscountId) : null,
        promo_code: promoCode || null,
        status: preSelectedStatus,
      };
      await createOrder(payload);
      toast.success("Order created successfully!");
      router.push("/dashboard/orders");
    } catch (error: any) {
      const messages = Object.values(error).flat().join(" ");
      toast.error(messages || "Failed to create order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  // ─── Clear all filters ───────────────────────────────────────────────────
const clearFilters = () => { 
  setSearchTerm("");
  setSelectedSku("");
  setShowSkuFilter(false);
};

  const roleName =
    typeof user?.role === "object" && user?.role !== null && "name" in user.role
      ? String(user.role.name)
      : typeof user?.role === "string"
        ? user.role
        : "";
  const canApplyDiscount = Boolean(
    roleName && ["admin", "branch_manager", "cashier"].includes(roleName),
  );
  const handleDiscountChange = (id: string) => {
    setSelectedDiscountId(id);
    setPromoCode(""); // reset promo code
  };

  return (
    <ProtectedOrder>
      <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-5 lg:px-6">
        <div className="overflow-hidden rounded-[30px] border border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_36%),linear-gradient(135deg,_rgba(255,255,255,0.95),_rgba(248,250,252,0.82))] p-4 shadow-[0_28px_80px_-30px_rgba(15,23,42,0.5)] sm:p-6 dark:bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.16),_transparent_36%),linear-gradient(135deg,_rgba(27,27,31,0.95),_rgba(15,23,42,0.86))]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-400">
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                Premium order builder
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Create a new order
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Build your order with speed and clarity using a more refined, high-end interface designed for busy service staff.
              </p>
            </div>

            <div className="rounded-[22px] border border-border/70 bg-background/85 px-3.5 py-3 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3 text-foreground">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{cart.length} item{cart.length === 1 ? "" : "s"}</p>
                  <p className="text-xs text-muted-foreground">Total ${grandTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* ─── Left Panel: Menu Browser ─── */}
          <div className="flex-1 space-y-4">
            {/* ─── Table Selection ─── */}
            <div className="rounded-[24px] border border-border/70 bg-card/85 p-3 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:p-4">
              <label
                htmlFor="table"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Select Table *
              </label>

              {preSelectedTable ? (
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3 text-sm text-foreground shadow-sm">
                  Table{" "}
                  {tables.find((t) => String(t.id) === preSelectedTable)
                    ?.table_number || preSelectedTable}
                  <input
                    type="hidden"
                    value={preSelectedTable}
                    {...register("table")}
                  />
                </div>
              ) : (
                <select
                  id="table"
                  {...register("table", { required: "Table is required" })}
                  className="w-full rounded-2xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a table</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      Table {table.table_number}{" "}
                      {table.status === "OCCUPIED" && "(Occupied)"}
                    </option>
                  ))}
                </select>
              )}

              {errors.table && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.table.message}
                </p>
              )}
            </div>

            {/* ─── Search and Filter Section ─── */}
            <div className="rounded-[24px] border border-border/70 bg-card/85 p-3 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 rounded-2xl border-border/70 bg-background/70 pl-9 text-sm shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSkuFilter(!showSkuFilter)}
                    className={cn(
                      "h-11 gap-1.5 rounded-2xl px-3",
                      showSkuFilter && "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                    )}
                  >
                    <Barcode className="h-4 w-4" />
                    SKU
                    {selectedSku && (
                      <span className="ml-1 h-2 w-2 rounded-full bg-indigo-400" />
                    )}
                  </Button>
                  {(searchTerm || selectedSku) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-11 rounded-2xl text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* ─── SKU Filter - Horizontal Chips ─── */}
              <AnimatePresence>
                {showSkuFilter && uniqueSkus.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-muted/25 p-2.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        <Barcode className="mr-1 inline h-3 w-3" />
                        SKUs:
                      </span>
                      <button
                        onClick={() => setSelectedSku("")}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs transition-all",
                          !selectedSku
                            ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/25"
                            : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        All
                      </button>
                      {uniqueSkus.map((sku) => (
                        <button
                          key={sku}
                          onClick={() => setSelectedSku(sku)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-mono transition-all",
                            selectedSku === sku
                              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/25"
                              : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          {sku}
                        </button>
                      ))}
                    </div>
                    <p className="ml-1 mt-2 text-xs text-muted-foreground">
                      {filteredItems.length} item(s) found
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Menu grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
              {filteredItems.length === 0 ? (
                <div className="col-span-2 rounded-[24px] border border-dashed border-border/70 bg-card/70 py-8 text-center text-muted-foreground shadow-sm">
                  <p>No menu items found.</p>
                  {(searchTerm || selectedSku) && (
                    <button
                      onClick={clearFilters}
                      className="mt-2 text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const cartItem = cart.find((i) => i.id === item.id);
                  const quantityInCart = cartItem?.quantity || 0;

                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => addToCart(item)}
                      disabled={!item.is_available}
                      className={cn(
                        "group relative overflow-hidden rounded-[22px] border p-3.5 text-left shadow-sm transition-all duration-300",
                        item.is_available
                          ? "border-border/70 bg-gradient-to-br from-background via-background to-muted/30 hover:-translate-y-0.5 hover:border-indigo-500/50 hover:shadow-[0_16px_40px_-22px_rgba(99,102,241,0.7)]"
                          : "cursor-not-allowed border-border/70 bg-muted/30 opacity-60"
                      )}
                    >
                      {quantityInCart > 0 && (
                        <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white shadow-lg">
                          {quantityInCart}
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate text-sm font-semibold text-foreground">
                              {item.name}
                            </h4>
                            {!item.is_available && (
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-amber-500">
                                Unavailable
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {item.category_name || "Uncategorized"}
                          </p>
                          {item.sku && (
                            <div className="mt-1 flex items-center gap-1">
                              <Barcode className="h-3 w-3 text-muted-foreground/60" />
                              <span className="text-[10px] font-mono text-muted-foreground/70">
                                {item.sku}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="ml-2 text-sm font-semibold text-indigo-400">
                          ${parseFloat(item.price).toFixed(2)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted/70 px-2 py-1">Tap to add</span>
                        <span className="font-medium text-foreground/80">Quick pick</span>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>

          {/* ─── Right Panel: Order Summary ─── */}
          <OrderSummary
            cart={cart}
            total={total}
            discountAmount={discountAmount}
            grandTotal={grandTotal}
            cartSplash={cartSplash}
            canApplyDiscount={canApplyDiscount}
            discounts={discounts}
            selectedDiscountId={selectedDiscountId}
            loadingDiscounts={loadingDiscounts}
            promoCode={promoCode}
            submitting={submitting}
            specialInstructions={specialInstructions}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onDiscountChange={handleDiscountChange}
            onPromoCodeChange={setPromoCode}
            onSpecialInstructionsChange={handleSpecialInstructionsChange}
            onSubmit={handleSubmit(onSubmit)}
          />
        </div>
      </div>
    </ProtectedOrder>
  );
}