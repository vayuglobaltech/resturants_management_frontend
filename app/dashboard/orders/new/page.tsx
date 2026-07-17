"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import OrderSummary from "@/components/orders/orderSummary";
import { getProductAvailabilities } from "@/lib/api";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  Table as TableIcon,
  Send,
  Loader2,
  Barcode,
  X,
  AlertCircle,
  Eye,
  ChevronUp,
  Tag,
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
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [tableError, setTableError] = useState<string>("");

  // ─── Discount State ──────────────────────────────────────────────────────
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [cartSplash, setCartSplash] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
    clearErrors,
  } = useForm<FormData>({
    defaultValues: {
      table: "",
      special_instructions: "",
    },
  });

  const selectedTableId = watch("table");
  const specialInstructions = watch("special_instructions");

  const searchParams = useSearchParams();
  const preSelectedTable = searchParams.get("table");
  const preSelectedStatus = searchParams.get("status") || "PENDING";

  // ─── Get available product IDs for user's branch ────────────────────────
  const availableProductIds = useMemo(() => {
    const userBranchId = (user as any)?.branch?.id;
    
    let filteredAvail = availabilities;
    if (userBranchId) {
      filteredAvail = availabilities.filter((a: any) => {
        const aBranch = typeof a.branch === 'object' ? a.branch.id : a.branch;
        return aBranch === userBranchId;
      });
    }
    
    return new Set(
      filteredAvail
        .filter((a: any) => a.is_available === true)
        .map((a: any) => typeof a.product === 'object' ? a.product.id : a.product)
    );
  }, [availabilities, user]);

  useEffect(() => {
    if (preSelectedTable) {
      setValue("table", preSelectedTable);
      clearErrors("table");
    }
  }, [preSelectedTable, setValue, clearErrors]);

  // ─── Fetch Tables, Menu, and Discounts ──────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tablesData, menuData, availData] = await Promise.all([
          listTables(),
          listMenuItems(),
          getProductAvailabilities().catch(() => [])
        ]);
        
        setTables(tablesData.results || tablesData || []);
        setMenuItems(menuData.results || menuData || []);
        
        const availArray = Array.isArray(availData) ? availData : availData?.results || [];
        setAvailabilities(availArray);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

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

  // ─── Get unique categories ──────────────────────────────────────────────
  const uniqueCategories = useMemo(() => {
    const categories = menuItems
      .map(item => item.category_name)
      .filter((category): category is string => !!category);
    return [...new Set(categories)].sort();
  }, [menuItems]);

  // ─── Filter Menu Items - ONLY SHOW AVAILABLE ITEMS ────────────────────
  const filteredItems = useMemo(() => {
    let filtered = menuItems;
    
    // Filter by availability
    if (availabilities.length > 0) {
      filtered = filtered.filter((item) => availableProductIds.has(item.id));
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((item) =>
        item.category_name?.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }
    
    return filtered;
  }, [menuItems, availabilities, availableProductIds, searchTerm, selectedCategory]);

  // ─── Handle Table Change ──────────────────────────────────────────────────
  const handleTableChange = (value: string) => {
    setValue("table", value);
    if (value) {
      clearErrors("table");
      setTableError("");
    }
    trigger("table");
  };

  // ─── Submit Order ────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    // Validate table selection
    if (!data.table) {
      setTableError("Please select a table");
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
        table: parseInt(data.table),
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
        <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  // ─── Clear all filters ───────────────────────────────────────────────────
  const clearFilters = () => { 
    setSearchTerm("");
    setSelectedCategory("");
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
    setPromoCode("");
  };

  // ─── Mobile Summary Toggle ──────────────────────────────────────────────
  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  return (
    <ProtectedOrder>
      <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-5 lg:px-6">
        {/* ─── Header ─────────────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-[30px] border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/10 via-background to-[var(--primary)]/5 p-4 shadow-[0_28px_80px_-30px_rgba(15,23,42,0.5)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                Premium order builder
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Create a new order
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Build your order with speed and clarity using a refined, high-end interface.
              </p>
            </div>

            <div className="rounded-[22px] border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3.5 py-3 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3 text-foreground">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
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
            {/* ─── Table Selection with View Summary Button ─── */}
            <div className="rounded-[24px] border border-[var(--primary)]/20 bg-card/85 p-3 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="table"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Select Table *
                  </label>

                  {preSelectedTable ? (
                    <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3 py-3 text-sm text-foreground shadow-sm">
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
                      onChange={(e) => handleTableChange(e.target.value)}
                      className={cn(
                        "w-full rounded-2xl border bg-background/80 px-3 py-2.5 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2",
                        errors.table || tableError
                          ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"
                          : "border-[var(--primary)]/20 focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
                      )}
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

                  {(errors.table || tableError) && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.table?.message || tableError}
                    </p>
                  )}
                </div>

                {/* ─── View Summary Button ─── */}
                <button
                  onClick={toggleCart}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] hover:bg-[color:var(--primary)]/80 px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/30 transition-all hover:shadow-[var(--primary)]/50 lg:hidden flex-shrink-0"
                >
                  <Eye className="h-4 w-4" />
                  <span>Summary</span>
                  {cart.length > 0 && (
                    <span className="ml-1 rounded-full bg-black/20 px-2 py-0.5 text-xs font-bold">
                      {cart.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ─── Search and Category Filter ─── */}
            <div className="rounded-[24px] border border-[var(--primary)]/20 bg-card/85 p-3 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-11 rounded-2xl border-[var(--primary)]/20 bg-background/70 pl-9 text-sm shadow-sm focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
                    />
                  </div>

                  {(searchTerm || selectedCategory) && (
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

                {/* ─── Category Filter - Always Visible ─── */}
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-2.5">
                  <button
                    onClick={() => setSelectedCategory("")}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs transition-all",
                      !selectedCategory
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/25"
                        : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    All
                  </button>
                  {uniqueCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs transition-all",
                        selectedCategory === category
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/25"
                          : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                
                <p className="ml-1 text-xs text-muted-foreground">
                  {filteredItems.length} item(s) found
                </p>
              </div>
            </div>

            {/* Menu grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-h-[70vh]  lg:overflow-y-auto lg:pr-1">
              {filteredItems.length === 0 ? (
                <div className="col-span-2 rounded-[24px] border border-dashed border-[var(--primary)]/30 bg-[var(--primary)]/5 py-8 text-center text-muted-foreground shadow-sm">
                  <AlertCircle className="mx-auto h-10 w-10 text-[var(--primary)]/40" />
                  <p className="mt-2">No menu items found.</p>
                  {(searchTerm || selectedCategory) && (
                    <button
                      onClick={clearFilters}
                      className="mt-2 text-sm text-[var(--primary)] hover:text-[color:var(--primary)]/80"
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
                        "group relative  rounded-[22px] border p-3.5 text-left shadow-sm transition-all duration-300 mt-3",
                        item.is_available
                          ? "border-[var(--primary)]/20 bg-gradient-to-br from-background via-background to-[var(--primary)]/5 hover:-translate-y-0.5 hover:border-[var(--primary)]/50 hover:shadow-[0_16px_40px_-22px_rgba(234,179,8,0.7)]"
                          : "cursor-not-allowed border-[var(--primary)]/20 bg-muted/30 opacity-60"
                      )}
                    >
                      {quantityInCart > 0 && (
                        <div className="absolute -right-1 -top-2 flex h-7 w-7  items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--primary-foreground)] shadow-lg">
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
                              <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--primary)]">
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
                        <span className="ml-2 text-sm font-semibold text-[var(--primary)]">
                          ${parseFloat(item.price).toFixed(2)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="rounded-full bg-[var(--primary)]/10 px-2 py-1 text-[var(--primary)]/70">
                          Tap to add
                        </span>
                        <span className="font-medium text-foreground/80">Quick pick</span>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>

          {/* ─── Right Panel: Order Summary (Desktop) ─── */}
          <div className="hidden lg:block lg:w-[380px] xl:w-[420px] flex-shrink-0">
            <div className="sticky top-4">
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
                tables={tables}
                selectedTableId={selectedTableId}
                tableError={tableError || errors.table?.message}
                onTableChange={handleTableChange}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
                onDiscountChange={handleDiscountChange}
                onPromoCodeChange={setPromoCode}
                onSpecialInstructionsChange={handleSpecialInstructionsChange}
                onSubmit={handleSubmit(onSubmit)}
              />
            </div>
          </div>
        </div>

        {/* ─── Mobile: Order Summary Overlay ─── */}
        <AnimatePresence>
          {isCartOpen && (
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-end lg:hidden"
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleCart}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* Summary Panel */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[30px] border border-[var(--primary)]/20 bg-gradient-to-b from-background to-[var(--primary)]/5 p-4 shadow-2xl"
              >
                {/* Handle Bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Order Summary</h2>
                      <p className="text-xs text-muted-foreground">
                        {cart.length} item{cart.length === 1 ? "" : "s"} • ${grandTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleCart}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground transition hover:bg-muted"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Divider */}
                <div className="mb-4 h-px bg-gradient-to-r from-[var(--primary)]/20 via-[var(--primary)]/40 to-[var(--primary)]/20" />

                {/* Order Summary Content */}
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
                  tables={tables}
                  selectedTableId={selectedTableId}
                  tableError={tableError || errors.table?.message}
                  onTableChange={handleTableChange}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeItem}
                  onDiscountChange={handleDiscountChange}
                  onPromoCodeChange={setPromoCode}
                  onSpecialInstructionsChange={handleSpecialInstructionsChange}
                  onSubmit={handleSubmit(onSubmit)}
                />

                {/* Bottom Close Button */}
                <button
                  onClick={toggleCart}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 py-3 text-sm font-medium text-muted-foreground transition hover:bg-[var(--primary)]/10"
                >
                  <ChevronUp className="h-4 w-4" />
                  Close Summary
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Mobile Floating Cart Button ─── */}
        {!isCartOpen && cart.length > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={toggleCart}
            className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[var(--primary)] hover:bg-[color:var(--primary)]/80 px-6 py-3 text-[var(--primary-foreground)] shadow-2xl shadow-[var(--primary)]/40 lg:hidden"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="font-medium">View Order</span>
            <span className="rounded-full bg-black/20 px-2.5 py-0.5 text-sm font-bold">
              {cart.length}
            </span>
          </motion.button>
        )}
      </div>
    </ProtectedOrder>
  );
}