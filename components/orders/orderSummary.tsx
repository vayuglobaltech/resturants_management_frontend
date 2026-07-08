"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface CartItem {
  id: number;
  name: string;
  price: string;
  quantity: number;
  [key: string]: any;
}

interface Discount {
  id: number;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  requires_code?: boolean;
}

interface OrderSummaryProps {
  cart: CartItem[];
  total: number;
  discountAmount: number;
  grandTotal: number;
  cartSplash: boolean;
  canApplyDiscount: boolean;
  discounts: Discount[];
  selectedDiscountId: string;
  loadingDiscounts: boolean;
  promoCode: string;
  submitting: boolean;
  specialInstructions: string;
  onUpdateQuantity: (id: number, delta: number) => void;
  onRemoveItem: (id: number) => void;
  onDiscountChange: (id: string) => void;
  onPromoCodeChange: (code: string) => void;
  onSpecialInstructionsChange: (instructions: string) => void;
  onSubmit: () => void;
}

export default function  OrderSummary({
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
  onUpdateQuantity,
  onRemoveItem,
  onDiscountChange,
  onPromoCodeChange,
  onSpecialInstructionsChange,
  onSubmit,
}: OrderSummaryProps) {
  return (
    <div className="lg:w-96 flex-shrink-0">
      <Card
        className={cn(
          "sticky top-20 bg-muted/30 border-border transition-all duration-300",
          cartSplash &&
            "ring-2 ring-indigo-500 ring-offset-2 ring-offset-background shadow-lg shadow-indigo-500/20"
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground flex items-center gap-2 text-base">
            <motion.div
              animate={
                cartSplash
                  ? {
                      scale: [1, 1.2, 1],
                      rotate: [0, -10, 10, -10, 0],
                    }
                  : {}
              }
              transition={{ duration: 0.5 }}
            >
              <ShoppingCart className="h-5 w-5 text-indigo-400" />
            </motion.div>
            Order Summary
            {cart.length > 0 && (
              <motion.span
                key={cart.length}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full"
              >
                {cart.length} items
              </motion.span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnimatePresence mode="wait">
            {cart.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-8 text-muted-foreground text-sm"
              >
                <p>No items added yet.</p>
                <p className="text-xs mt-1">
                  Select items from the left panel.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  <AnimatePresence initial={false}>
                    {cart.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ delay: index * 0.05 }}
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
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <motion.span
                            key={item.quantity}
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            className="text-foreground text-sm w-6 text-center font-medium"
                          >
                            {item.quantity}
                          </motion.span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 ml-1 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* ─── Totals with splash animation ────────────────────────── */}
                <motion.div
                  className="pt-3 border-t border-border space-y-1"
                  animate={
                    cartSplash
                      ? {
                          scale: [1, 1.02, 1],
                        }
                      : {}
                  }
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between text-foreground">
                    <span>Subtotal</span>
                    <motion.span
                      key={total}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      ${total.toFixed(2)}
                    </motion.span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount</span>
                      <motion.span
                        key={discountAmount}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        -${discountAmount.toFixed(2)}
                      </motion.span>
                    </div>
                  )}
                  <div className="flex justify-between text-foreground font-bold text-lg pt-1 border-t border-border">
                    <span>Grand Total</span>
                    <motion.span
                      className="text-indigo-400"
                      key={grandTotal}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      ${grandTotal.toFixed(2)}
                    </motion.span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Discount Dropdown ────────────────────────────────── */}
          {canApplyDiscount && (
            <div className="pt-2 border-t border-border">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Apply Discount
              </label>
              <select
                value={selectedDiscountId}
                onChange={(e) => onDiscountChange(e.target.value)}
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
                    )
                    {d.requires_code ? " 🔑" : ""}
                  </option>
                ))}
              </select>

              {/* ─── Promo Code Input ─── */}
              {selectedDiscountId &&
                discounts.find((d) => String(d.id) === selectedDiscountId)
                  ?.requires_code && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden"
                  >
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Promo Code
                    </label>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => onPromoCodeChange(e.target.value)}
                      placeholder="Enter promo code..."
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </motion.div>
                )}
            </div>
          )}

          {/* ─── Special Instructions ────────────────────────────── */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Special Instructions
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => onSpecialInstructionsChange(e.target.value)}
              rows={2}
              placeholder="e.g. No onions, extra cheese..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* ─── Submit Button ────────────────────────────────────── */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Button
              onClick={onSubmit}
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
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}