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
  onUpdateQuantity,
  onRemoveItem,
  onDiscountChange,
  onPromoCodeChange,
  onSpecialInstructionsChange,
  onSubmit,
}: OrderSummaryProps) {
  return (
    <div className="w-full flex-shrink-0 lg:w-96">
      <Card
        className={cn(
          "sticky top-4 rounded-[24px] border border-border/70 bg-card/90 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 lg:top-20",
          cartSplash &&
            "ring-2 ring-indigo-500/70 ring-offset-2 ring-offset-background shadow-lg shadow-indigo-500/20"
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2 text-base text-foreground">
            <div className="flex items-center gap-2">
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
            </div>
            {cart.length > 0 && (
              <motion.span
                key={cart.length}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-400"
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
                className="rounded-2xl border border-dashed border-border/70 bg-background/70 py-8 text-center text-sm text-muted-foreground"
              >
                <p>No items added yet.</p>
                <p className="mt-1 text-xs">
                  Select items from the menu to start your order.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1 sm:max-h-[280px]">
                  <AnimatePresence initial={false}>
                    {cart.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-2 rounded-2xl border border-border/60 bg-gradient-to-br from-background to-muted/20 p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${parseFloat(item.price).toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <motion.span
                            key={item.quantity}
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            className="w-6 text-center text-sm font-semibold text-foreground"
                          >
                            {item.quantity}
                          </motion.span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="ml-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <motion.div
                  className="space-y-1.5 rounded-[20px] border border-border/60 bg-background/70 p-3"
                  animate={
                    cartSplash
                      ? {
                          scale: [1, 1.02, 1],
                        }
                      : {}
                  }
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between text-sm text-foreground">
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
                    <div className="flex justify-between text-sm text-emerald-500">
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
                  <div className="flex justify-between border-t border-border/70 pt-2 text-base font-semibold text-foreground">
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

          {canApplyDiscount && (
            <div className="rounded-[20px] border border-border/60 bg-background/70 p-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Apply Discount
              </label>
              <select
                value={selectedDiscountId}
                onChange={(e) => onDiscountChange(e.target.value)}
                className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

              {selectedDiscountId &&
                discounts.find((d) => String(d.id) === selectedDiscountId)
                  ?.requires_code && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden"
                  >
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Promo Code
                    </label>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => onPromoCodeChange(e.target.value)}
                      placeholder="Enter promo code..."
                      className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </motion.div>
                )}
            </div>
          )}

          <div className="rounded-[20px] border border-border/60 bg-background/70 p-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Special Instructions
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => onSpecialInstructionsChange(e.target.value)}
              rows={2}
              placeholder="e.g. No onions, extra cheese..."
              className="w-full resize-none rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              onClick={onSubmit}
              disabled={cart.length === 0 || submitting}
              className="h-12 w-full gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20"
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