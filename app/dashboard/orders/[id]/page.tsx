"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOrder, updateOrder, addOrderItem, deleteOrderItem, getActiveDiscounts } from "@/lib/ordersApi";
import { getRecipeByProduct, getBranchInventory } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCanManage, useCanModifyOrders } from "@/hooks/usePermissions";
import {
  ArrowLeft,
  Clock,
  ShoppingCart,
  User,
  CheckCircle2,
  ChevronRight,
  Hash,
  RefreshCw,
  Loader2,
  Utensils,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { listMenuItems } from "@/lib/menuApi";

// Status colors
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CONFIRMED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  QUEUED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  PREPARING: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  READY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  DELIVERED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  PAID: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const ROLE_TRANSITIONS: Record<string, string[]> = {
  waiter: ["CONFIRMED", "DELIVERED", "CANCELLED"],
  kitchen_staff: ["QUEUED", "PREPARING", "READY"],
  cashier: ["PAID"],
  admin: [],
  branch_manager: [],
};

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const canModify = useCanModifyOrders();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [recipeData, setRecipeData] = useState<Record<number, any>>({});
  const [inventoryData, setInventoryData] = useState<Record<number, number>>({});

  // ─── Add item state ──────────────────────────────────────────────────
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemProduct, setNewItemProduct] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [fetchingMenu, setFetchingMenu] = useState(false);

  // ─── Discount state ──────────────────────────────────────────────────
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");
  const [updatingDiscount, setUpdatingDiscount] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  const fetchOrder = async () => {
    try {
      const data = await getOrder(id);
      setOrder(data);
      setSelectedStatus(data.status);
      // If order already has a discount, pre‑select it
      if (data.discounts && data.discounts.length > 0) {
        setSelectedDiscountId(String(data.discounts[0].discount));
      } else {
        setSelectedDiscountId("");
      }
    } catch (error) {
      console.error("Failed to fetch order details:", error);
      toast.error("Order not found.");
      router.push("/dashboard/orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // ─── Fetch active discounts (only for cashier/manager/admin) ──────
  const canApplyDiscount = user && ["admin", "branch_manager", "cashier"].includes(user.role?.name);
  useEffect(() => {
    if (!canApplyDiscount) return;
    const fetchDiscounts = async () => {
      try {
        const data = await getActiveDiscounts();
        setDiscounts(data);
      } catch (error) {
        console.error("Failed to fetch discounts:", error);
      }
    };
    fetchDiscounts();
  }, [canApplyDiscount]);

  const role = user?.role && typeof user.role === "object" ? user.role.name : null;

  const getAvailableStatuses = () => {
    if (!order) return [];
    const current = order.status;
    if (role === "admin" || role === "branch_manager") {
      return Object.keys(STATUS_COLORS);
    }
    const allowed = ROLE_TRANSITIONS[role || ""] || [];
    const validTransitions: Record<string, string[]> = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["QUEUED", "CANCELLED"],
      QUEUED: ["PREPARING"],
      PREPARING: ["READY"],
      READY: ["DELIVERED"],
      DELIVERED: ["PAID"],
      PAID: [],
      CANCELLED: [],
    };
    const allowedFromCurrent = validTransitions[current] || [];
    return allowed.filter((s) => allowedFromCurrent.includes(s));
  };

  const availableStatuses = getAvailableStatuses();

  const handleUpdateStatus = async () => {
    if (!selectedStatus || selectedStatus === order.status) return;
    setUpdating(true);
    try {
      await updateOrder(id, { status: selectedStatus });
      toast.success(`Order status updated to ${selectedStatus}`);
      fetchOrder();
    } catch (error: any) {
      const msg = error?.detail || error?.message || "Failed to update status.";
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  // ─── Handle apply discount ──────────────────────────────────────────
  const handleApplyDiscount = async () => {
    setUpdatingDiscount(true);
    try {
      await updateOrder(id, { 
        discount_id: selectedDiscountId ? parseInt(selectedDiscountId) : null,
        promo_code: promoCode || null
      });
      toast.success("Discount updated");
      fetchOrder(); // refresh order details
    } catch (error: any) {
      const msg = error?.detail || error?.promo_code || error?.message || "Failed to update discount.";
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      // revert selection
      if (order?.discounts?.length > 0) {
        setSelectedDiscountId(String(order.discounts[0].discount));
      } else {
        setSelectedDiscountId("");
      }
      setPromoCode("");
    } finally {
      setUpdatingDiscount(false);
    }
  };

  // ─── Toggle Recipe ─────────────────────────────────────────────
  const toggleRecipe = async (itemId: number, productId: number, branchId: number) => {
    if (expandedItems[itemId]) {
      setExpandedItems((prev) => ({ ...prev, [itemId]: false }));
      return;
    }

    setExpandedItems((prev) => ({ ...prev, [itemId]: true }));

    if (!recipeData[productId]) {
      try {
        const recipe = await getRecipeByProduct(productId);
        if (recipe) {
          setRecipeData((prev) => ({ ...prev, [productId]: recipe }));
          if (Object.keys(inventoryData).length === 0) {
            const inv = await getBranchInventory(branchId);
            const invMap: Record<number, number> = {};
            inv.forEach((item: any) => {
              invMap[item.ingredient] = item.quantity;
            });
            setInventoryData(invMap);
          }
        } else {
          toast.error("No recipe found for this product.");
        }
      } catch (error) {
        console.error("Failed to fetch recipe:", error);
        toast.error("Failed to load recipe.");
      }
    }
  };

  // ─── Add Item ──────────────────────────────────────────────────
  const fetchMenuItems = async () => {
    setFetchingMenu(true);
    try {
      const data = await listMenuItems();
      setMenuItems(data.results || data || []);
    } catch (error) {
      toast.error("Failed to load menu items.");
    } finally {
      setFetchingMenu(false);
    }
  };

  useEffect(() => {
    if (showAddItem) {
      fetchMenuItems();
    }
  }, [showAddItem]);

  const handleAddItem = async () => {
    if (!newItemProduct) {
      toast.error("Please select a product.");
      return;
    }
    try {
      await addOrderItem({
        order: parseInt(id),
        product: parseInt(newItemProduct),
        quantity: newItemQty,
      });
      toast.success("Item added successfully!");
      setShowAddItem(false);
      setNewItemProduct("");
      setNewItemQty(1);
      fetchOrder();
    } catch (error: any) {
      const msg = Object.values(error).flat().join(" ");
      toast.error(msg || "Failed to add item.");
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("Remove this item from the order?")) return;
    try {
      await deleteOrderItem(itemId);
      toast.success("Item removed.");
      fetchOrder();
    } catch (error: any) {
      toast.error(error?.detail || "Failed to remove item.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Order not found.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[order.status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";

  // ─── Compute discount total ──────────────────────────────────
  const totalDiscount = order.discounts?.reduce((sum: number, d: any) => sum + parseFloat(d.amount), 0) || 0;

  // ─── Check if the current user can apply discounts ────────────────
  const canApplyDiscountHere = user && ["admin", "branch_manager", "cashier"].includes(user.role?.name);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/dashboard/orders" className="hover:text-white transition-colors">
            Orders
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-white font-medium">{order.order_number}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("px-3 py-1 text-xs font-semibold rounded-full border", statusColor)}>
            {order.status}
          </span>

          {availableStatuses.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Status</option>
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleUpdateStatus}
                disabled={updating || selectedStatus === order.status}
                className="gap-1.5"
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {updating ? "Updating..." : "Update"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-white/[0.05] bg-white/[0.02]">
            <CardHeader className="pb-4 border-b border-white/[0.05]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-indigo-400" />
                  Order Items
                </CardTitle>
                {canModify && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddItem(!showAddItem)}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Add Item Form */}
              {showAddItem && canModify && (
                <div className="p-4 border-b border-white/5 bg-white/[0.03]">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-xs text-slate-400 block mb-1">Product</label>
                      <select
                        value={newItemProduct}
                        onChange={(e) => setNewItemProduct(e.target.value)}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        {fetchingMenu ? (
                          <option disabled>Loading...</option>
                        ) : (
                          menuItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} (${item.price})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-slate-400 block mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <Button size="sm" onClick={handleAddItem} className="mb-0.5">
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAddItem(false)}
                      className="mb-0.5"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Order Items List */}
              <div className="divide-y divide-white/[0.05]">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any) => {
                    const isExpanded = expandedItems[item.id];
                    const recipe = recipeData[item.product];
                    const ingredients = recipe?.ingredients || [];

                    return (
                      <div key={item.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                              <span className="text-indigo-400 font-bold">{item.quantity}x</span>
                            </div>
                            <div>
                              <h4 className="text-white font-medium">{item.product_name || "Unknown Product"}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">SKU: {item.product_sku}</p>
                              {item.product && (
                                <button
                                  onClick={() => toggleRecipe(item.id, item.product, order.branch)}
                                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mt-1"
                                >
                                  <Utensils className="h-3 w-3" />
                                  {isExpanded ? "Hide Recipe" : "View Recipe"}
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-white font-bold">${parseFloat(item.price_at_order).toFixed(2)}</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                ${(parseFloat(item.price_at_order) * item.quantity).toFixed(2)} total
                              </div>
                            </div>
                            {canModify && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Recipe Ingredients (expanded) */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-white/5">
                            {ingredients.length === 0 ? (
                              <p className="text-xs text-slate-400">No ingredients defined for this recipe.</p>
                            ) : (
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-slate-400 mb-1">Ingredients & Stock</p>
                                {ingredients.map((ing: any) => {
                                  const stock = inventoryData[ing.ingredient] ?? 0;
                                  const required = parseFloat(ing.quantity) * item.quantity;
                                  const isSufficient = stock >= required;
                                  return (
                                    <div key={ing.id} className="flex items-center justify-between text-sm bg-white/5 p-2 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white">{ing.ingredient_name}</span>
                                        <span className="text-slate-400 text-xs">
                                          {ing.quantity} {ing.unit} × {item.quantity} = {required} {ing.unit}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-slate-300">
                                          Stock: {stock} {ing.unit}
                                        </span>
                                        <span className={cn(
                                          "text-xs px-2 py-0.5 rounded-full",
                                          isSufficient ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                        )}>
                                          {isSufficient ? "✅ Sufficient" : "❌ Insufficient"}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400">No items in this order.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {order.special_instructions && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-amber-400 mb-2">Special Instructions</h4>
                <p className="text-sm text-slate-300">{order.special_instructions}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Order Summary */}
<div className="space-y-6">
  <Card className="border-white/[0.05] bg-white/[0.02]">
    <CardHeader className="pb-4 border-b border-white/[0.05]">
      <CardTitle className="text-lg">Order Summary</CardTitle>
    </CardHeader>
    <CardContent className="p-4 space-y-4">
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-400 flex items-center gap-2"><Hash className="h-4 w-4"/> Order ID</span>
        <span className="text-white">{order.order_number}</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-400 flex items-center gap-2"><User className="h-4 w-4"/> Server/User</span>
        <span className="text-white">{order.user_name || "Guest"}</span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-400 flex items-center gap-2"><Clock className="h-4 w-4"/> Created At</span>
        <span className="text-white">
          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> Priority</span>
        <span className="text-white">{order.priority}</span>
      </div>

      {/* ─── Discounts Applied ─── */}
      {order.discounts && order.discounts.length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <h4 className="text-sm font-medium text-slate-400 mb-1">Discounts Applied</h4>
          {order.discounts.map((disc: any) => (
            <div key={disc.id} className="flex justify-between text-sm">
              <span className="text-slate-300">{disc.discount_name}</span>
              <span className="text-emerald-400">-${parseFloat(disc.amount).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-medium pt-1 border-t border-white/5">
            <span className="text-slate-400">Total Discount</span>
            <span className="text-emerald-400">-${totalDiscount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* ─── Apply Discount (Cashier/Manager/Admin only) ─── */}
      {/* ─── Apply Discount (Cashier/Manager/Admin only) ─── */}
{canApplyDiscountHere && (
  <div className="pt-2 border-t border-white/5">
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Apply Discount
        </label>
        <select
          value={selectedDiscountId}
          onChange={(e) => setSelectedDiscountId(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={updatingDiscount}
        >
          <option value="">No discount</option>
          {discounts.map((d) => (
            <option key={d.id} value={String(d.id)}>
              {d.name} ({d.type === "percentage" ? `${d.value}%` : `$${d.value}`})
              {d.requires_code ? " 🔑" : ""}
            </option>
          ))}
        </select>
        {updatingDiscount && <p className="text-xs text-slate-500 mt-1">Updating...</p>}
      </div>

      {/* ─── Remove discount button ─── */}
      {selectedDiscountId && (
        <button
          onClick={async () => {
             setUpdatingDiscount(true);
             try {
                await updateOrder(id, { discount_id: null });
                toast.success("Discount removed");
                fetchOrder();
                setPromoCode("");
             } catch(error: any) {
                toast.error("Failed to remove discount.");
             } finally {
                setUpdatingDiscount(false);
             }
          }}
          disabled={updatingDiscount}
          className="mt-5 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Remove discount"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>

    {/* ─── Promo Code Input ─── */}
    {selectedDiscountId && discounts.find(d => String(d.id) === selectedDiscountId)?.requires_code && (
      <div className="mt-2">
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Promo Code
        </label>
        <input
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="Enter promo code..."
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    )}

    {selectedDiscountId && (
       <Button 
         size="sm" 
         className="w-full mt-3" 
         onClick={handleApplyDiscount}
         disabled={updatingDiscount}
       >
         Apply Discount
       </Button>
    )}
  </div>
)}

      <div className="pt-4 border-t border-white/[0.05]">
        <div className="flex justify-between items-center">
          <span className="text-slate-300 font-medium">Total Amount</span>
          <span className="text-xl font-bold text-emerald-400">
            ${parseFloat(order.total_amount || 0).toFixed(2)}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
      </div>
    </div>
  );
}