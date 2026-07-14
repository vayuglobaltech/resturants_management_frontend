"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  Table as TableIcon,
  Send,
  Loader2,
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
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ─── Discount State ──────────────────────────────────────────────────────
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [promoCode, setPromoCode] = useState("");

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
      const role = user?.role?.name;
      if (!role || !["admin", "branch_manager", "cashier"].includes(role))
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

  // ─── Filter Menu Items ──────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return menuItems;
    return menuItems.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [menuItems, searchTerm]);

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

  // const roleName = typeof user?.role === 'object' ? user.role.name : user?.role;
  // const canApplyDiscount = roleName && ["admin", "branch_manager", "cashier"].includes(roleName);
  const roleName = typeof user?.role === "object" ? user.role.name : user?.role;
  const canApplyDiscount =
    roleName && ["admin", "branch_manager", "cashier"].includes(roleName);
  const handleDiscountChange = (id: string) => {
    setSelectedDiscountId(id);
    setPromoCode(""); // reset promo code
  };

  return (
    <ProtectedOrder>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">New Order</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Left Panel: Menu Browser ─── */}
          <div className="flex-1 space-y-4">
            {/* ─── Table Selection ─── */}
            <div>
              <label
                htmlFor="table"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Select Table *
              </label>

              {preSelectedTable ? (
                // ─── Locked: read‑only display ──────────────────────────────────────
                <div className="text-white bg-white/5 px-3 py-2 rounded-md border border-white/10">
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
                // ─── Normal dropdown ────────────────────────────────────────────────
                <select
                  id="table"
                  {...register("table", { required: "Table is required" })}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <p className="text-sm text-red-400 mt-1">
                  {errors.table.message}
                </p>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Menu grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {filteredItems.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No menu items found.
                </div>
              ) : (
                filteredItems.map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToCart(item)}
                    disabled={!item.is_available}
                    className={cn(
                      "text-left p-3 rounded-xl border transition-all",
                      item.is_available
                        ? "border-border hover:border-indigo-500/50 bg-muted/30 hover:bg-muted/30"
                        : "border-border bg-muted/30 opacity-50 cursor-not-allowed",
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-foreground font-medium text-sm truncate">
                          {item.name}
                        </h4>
                        <p className="text-muted-foreground text-xs line-clamp-1">
                          {item.category_name || "Uncategorized"}
                        </p>
                      </div>
                      <span className="text-indigo-400 font-bold text-sm ml-2">
                        ${parseFloat(item.price).toFixed(2)}
                      </span>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </div>

          {/* ─── Right Panel: Order Summary ─── */}
          <div className="lg:w-96 flex-shrink-0">
            <Card className="sticky top-20 bg-muted/30 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-2 text-base">
                  <ShoppingCart className="h-5 w-5 text-indigo-400" />
                  Order Summary
                  {cart.length > 0 && (
                    <span className="ml-auto text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                      {cart.length} items
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <p>No items added yet.</p>
                    <p className="text-xs mt-1">
                      Select items from the left panel.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-64 overflow-y-auto space-y-1.5">
                      {cart.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-background"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground text-sm font-medium truncate">
                              {item.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              ${parseFloat(item.price).toFixed(2)} x{" "}
                              {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-foreground text-sm w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 ml-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* ─── Totals ────────────────────────────────────────── */}
                    <div className="pt-3 border-t border-border space-y-1">
                      <div className="flex justify-between text-foreground">
                        <span>Subtotal</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Discount</span>
                          <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-foreground font-bold text-lg pt-1 border-t border-border">
                        <span>Grand Total</span>
                        <span className="text-indigo-400">
                          ${grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* ─── Discount Dropdown ────────────────────────────────── */}
                {canApplyDiscount && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Apply Discount
                    </label>
                    <select
                      value={selectedDiscountId}
                      onChange={(e) => handleDiscountChange(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={loadingDiscounts}
                    >
                      <option value="">No discount</option>
                      {discounts.map((d) => (
                        <option key={d.id} value={String(d.id)}>
                          {d.name} (
                          {d.type === "percentage"
                            ? `${d.value}%`
                            : `$${d.value}`}
                          ){d.requires_code ? " 🔑" : ""}
                        </option>
                      ))}
                    </select>

                    {/* ─── Promo Code Input ─── */}
                    {selectedDiscountId &&
                      discounts.find((d) => String(d.id) === selectedDiscountId)
                        ?.requires_code && (
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Promo Code
                          </label>
                          <input
                            type="text"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            placeholder="Enter promo code..."
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                  </div>
                )}
                {/* ─── Special Instructions ────────────────────────────── */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Special Instructions
                  </label>
                  <textarea
                    {...register("special_instructions")}
                    rows={2}
                    placeholder="e.g. No onions, extra cheese..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* ─── Submit Button ────────────────────────────────────── */}
                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={cart.length === 0 || submitting}
                  className="w-full gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {submitting ? "Creating Order..." : "Create Order"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedOrder>
  );
}
