"use client";

import React from "react";

interface InvoiceItem {
  id: number;
  product_name: string;
  quantity: number;
  price_at_order: string;
}

interface InvoiceDiscount {
  id: number;
  discount_name: string;
  amount: number;
}

interface InvoicePreviewProps {
  tableNumber: number | null;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  customerName: string;
  cashierName: string;
  paymentMethod: string;
  orderNumber?: string;
  date?: string;
  discounts?: InvoiceDiscount[];
  totalDiscount?: number;
}

export function InvoicePreview({
  tableNumber,
  items,
  subtotal,
  tax,
  grandTotal,
  customerName,
  cashierName,
  paymentMethod,
  orderNumber,
  date,
  discounts = [],
  totalDiscount = 0,
}: InvoicePreviewProps) {
  if (!tableNumber || items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Select a table to preview invoice
      </div>
    );
  }

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleString();

  return (
    <div
      className="bg-white text-black p-6 rounded-xl shadow-lg max-w-xl mx-auto"
      id="invoice-content"
    >
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <h1 className="text-2xl font-bold">🍽️ VayuTech Restaurant</h1>
        <p className="text-sm text-gray-600">123 Main Street, Kathmandu</p>
        <p className="text-sm text-gray-600">Phone: +977-9841234567</p>
      </div>

      {/* Invoice Details */}
      <div className="flex justify-between text-sm mb-4">
        <div>
          <p>
            <strong>Table:</strong> {tableNumber}
          </p>
          <p>
            <strong>Date:</strong> {formatDate(date)}
          </p>
          {orderNumber && (
            <p>
              <strong>Order:</strong> #{orderNumber}
            </p>
          )}
        </div>
        <div className="text-right">
          <p>
            <strong>Customer:</strong> {customerName || "Guest"}
          </p>
          <p>
            <strong>Cashier:</strong> {cashierName}
          </p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left py-2">Qty</th>
            <th className="text-left py-2">Item</th>
            <th className="text-right py-2">Unit Price</th>
            <th className="text-right py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-2">{item.quantity}</td>
              <td className="py-2">{item.product_name}</td>
              <td className="text-right py-2">
                ${parseFloat(item.price_at_order).toFixed(2)}
              </td>
              <td className="text-right py-2">
                ${(parseFloat(item.price_at_order) * item.quantity).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="border-t border-gray-300 pt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax (15%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>

        {/* ─── Discounts ─── */}
        {discounts.length > 0 && (
          <div className="border-t border-gray-200 pt-2 space-y-1">
            {discounts.map((d) => (
              <div key={d.id} className="flex justify-between text-emerald-600">
                <span>{d.discount_name}</span>
                <span>-${Number(d.amount).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-medium text-emerald-700">
              <span>Total Discount</span>
              <span>-${totalDiscount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
          <span>Grand Total</span>
          <span>${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-300 text-sm text-gray-600">
        <p>
          <strong>Payment Method:</strong> {paymentMethod}
        </p>
        <p className="text-center text-xs mt-4">Thank you for your visit!</p>
      </div>
    </div>
  );
}