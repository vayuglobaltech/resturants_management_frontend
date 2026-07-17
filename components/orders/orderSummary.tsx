// components/orders/orderSummary.tsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Send,
  Loader2,
  X,
  AlertCircle,
  Table as TableIcon,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface CartItem {
  id: number;
  name: string;
  price: string;
  quantity: number;
}

interface Table {
  id: number;
  table_number: number;
  status: string;
}

interface OrderSummaryProps {
  cart: CartItem[];
  total: number;
  discountAmount: number;
  grandTotal: number;
  cartSplash: boolean;
  canApplyDiscount: boolean;
  discounts: any[];
  selectedDiscountId: string;
  loadingDiscounts: boolean;
  promoCode: string;
  submitting: boolean;
  specialInstructions: string;
  tables?: Table[];
  selectedTableId?: string;
  tableError?: string;
  onUpdateQuantity: (id: number, delta: number) => void;
  onRemoveItem: (id: number) => void;
  onDiscountChange: (id: string) => void;
  onPromoCodeChange: (code: string) => void;
  onSpecialInstructionsChange: (instructions: string) => void;
  onTableChange?: (value: string) => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

export default function OrderSummary({
  cart,
  total,
  discountAmount,
  grandTotal,
  cartSplash,
  canApplyDiscount,
  discounts,
  selectedDiscountId,
  loadingDiscounts,
  promoCode,
  submitting,
  specialInstructions,
  tables = [],
  selectedTableId = "",
  tableError = "",
  onUpdateQuantity,
  onRemoveItem,
  onDiscountChange,
  onPromoCodeChange,
  onSpecialInstructionsChange,
  onTableChange,
  onSubmit,
}: OrderSummaryProps) {
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-[var(--primary)]/20 bg-card/85 p-4 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-[var(--primary)]" />
          Order Summary
        </h2>
        <span className="text-xs text-muted-foreground">
          {cart.length} item{cart.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ─── Table Selection ─────────────────────────────────────────────── */}
      {tables.length > 0 && onTableChange && (
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Select Table *
          </label>
          <select
            value={selectedTableId}
            onChange={(e) => onTableChange(e.target.value)}
            className={cn(
              "w-full rounded-xl border bg-background/80 px-3 py-2.5 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2",
              tableError
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
          {tableError && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {tableError}
            </p>
          )}
        </div>
      )}

      {/* ─── Cart Items ──────────────────────────────────────────────────── */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {cart.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Your cart is empty</p>
            <p className="text-xs">Add items from the menu</p>
          </div>
        ) : (
          cart.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border hover:border-[var(--primary)]/20 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${parseFloat(item.price).toFixed(2)} × {item.quantity}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-foreground">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors ml-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ─── Special Instructions ────────────────────────────────────────── */}
      <div className="mt-4">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Special Instructions
        </label>
        <Input
          value={specialInstructions}
          onChange={(e) => onSpecialInstructionsChange(e.target.value)}
          placeholder="e.g., No onions, extra spicy..."
          className="rounded-xl border-[var(--primary)]/20 bg-background/70 text-sm focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
        />
      </div>

      {/* ─── Discount Section ────────────────────────────────────────────── */}
      {canApplyDiscount && (
        <div className="mt-4">
          <button
            onClick={() => setIsDiscountOpen(!isDiscountOpen)}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {isDiscountOpen ? "Hide" : "Apply"} Discount
            <span className="text-[10px]">▼</span>
          </button>

          <AnimatePresence>
            {isDiscountOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-2">
                  {loadingDiscounts ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin text-[var(--primary)]" />
                      Loading discounts...
                    </div>
                  ) : discounts.length > 0 ? (
                    <select
                      value={selectedDiscountId}
                      onChange={(e) => onDiscountChange(e.target.value)}
                      className="w-full rounded-xl border border-[var(--primary)]/20 bg-background/70 px-3 py-2 text-sm text-foreground focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
                    >
                      <option value="">Select discount</option>
                      {discounts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.type === "percentage" ? `${d.value}%` : `$${d.value}`})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-muted-foreground">No discounts available</p>
                  )}

                  <Input
                    value={promoCode}
                    onChange={(e) => onPromoCodeChange(e.target.value)}
                    placeholder="Promo code"
                    className="rounded-xl border-[var(--primary)]/20 bg-background/70 text-sm focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Totals ───────────────────────────────────────────────────────── */}
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground">${total.toFixed(2)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-emerald-400">Discount</span>
            <span className="text-emerald-400">-${discountAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          <span className="font-semibold text-foreground">Total</span>
          <span className="text-lg font-bold text-[var(--primary)]">
            ${grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ─── Submit Button ───────────────────────────────────────────────── */}
      <Button
        onClick={onSubmit}
        disabled={submitting || cart.length === 0 || !selectedTableId}
        className="w-full  mt-4 gap-2 bg-[var(--primary)] hover:bg-[color:var(--primary)]/80 text-[var(--primary-foreground)] font-semibold shadow-lg shadow-[var(--primary)]/25"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating Order...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Create Order
          </>
        )}
      </Button>

      {/* ─── Validation Messages ────────────────────────────────────────── */}
      {!selectedTableId && cart.length > 0 && (
        <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Please select a table before creating the order
        </p>
      )}

      {/* ─── Cart Splash Animation ──────────────────────────────────────── */}
      <AnimatePresence>
        {cartSplash && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <div className="bg-[var(--primary)]/20 backdrop-blur-sm rounded-full p-8">
              <CheckCircle className="h-12 w-12 text-[var(--primary)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}