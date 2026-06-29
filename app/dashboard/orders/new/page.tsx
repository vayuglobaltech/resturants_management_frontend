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
import { createOrder } from "@/lib/ordersApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ProtectedOrder } from "@/components/ProtectedOrder";

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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      table: "",
      special_instructions: "None",
    },
  });

  const selectedTableId = watch("table");

  // Fetch tables and menu items
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
  }, []);

  // Filter menu items by search
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return menuItems;
    return menuItems.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [menuItems, searchTerm]);

  // Add item to cart
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  // Update item quantity
  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((i) => i.id !== id);
      }
      return prev.map((i) =>
        i.id === id ? { ...i, quantity: newQty } : i
      );
    });
  };

  // Remove item from cart
  const removeItem = (id: number) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  // Calculate total
  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  }, [cart]);

  // Submit order
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
        branch: user?.branch?.id || 1,
        priority: false,
        special_instructions: data.special_instructions || "",
        items_data: cart.map((item) => ({
          menu_item: item.id,
          quantity: item.quantity,
        })),
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

  return (
    <ProtectedOrder>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">New Order</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Left Panel: Menu Browser ─── */}
          <div className="flex-1 space-y-4">

            <div>
  <label htmlFor="special_instructions" className="block text-sm font-medium text-slate-300 mb-1">
    Special Instructions
  </label>
  <textarea
    id="special_instructions"
    {...register("special_instructions")}
    rows={2}
    placeholder="e.g., No onions, extra cheese…"
    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
  />
</div>


            {/* Table selector */}
            <div>
              <label htmlFor="table" className="block text-sm font-medium text-slate-300 mb-1">
                Select Table *
              </label>
              <select
                id="table"
                {...register("table", { required: "Table is required" })}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a table</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    Table {table.table_number} {table.status === "OCCUPIED" && "(Occupied)"}
                  </option>
                ))}
              </select>
              {errors.table && <p className="text-sm text-red-400 mt-1">{errors.table.message}</p>}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
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
                <div className="col-span-2 text-center py-8 text-slate-400">
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
                        ? "border-white/10 hover:border-indigo-500/50 bg-white/[0.03] hover:bg-white/[0.06]"
                        : "border-white/5 bg-white/[0.01] opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm truncate">
                          {item.name}
                        </h4>
                        <p className="text-slate-400 text-xs line-clamp-1">
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
            <Card className="sticky top-20 bg-white/[0.03] border-white/[0.08]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center gap-2 text-base">
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
                  <div className="text-center py-8 text-slate-400 text-sm">
                    <p>No items added yet.</p>
                    <p className="text-xs mt-1">Select items from the left panel.</p>
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
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {item.name}
                            </p>
                            <p className="text-slate-400 text-xs">
                              ${parseFloat(item.price).toFixed(2)} x {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-white text-sm w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400 ml-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      <div className="flex justify-between text-white font-semibold">
                        <span>Total</span>
                        <span className="text-indigo-400">
                          ${total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Special instructions */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Special Instructions
                  </label>
                  <textarea
                    {...register("special_instructions")}
                    rows={2}
                    placeholder="e.g. No onions, extra cheese..."
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

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