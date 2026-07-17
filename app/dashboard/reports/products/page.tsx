"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingBag,
  Loader2,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── ✅ SET THIS TO YOUR ACTUAL PRODUCT API ENDPOINT ──────────────────────
// Check the Network tab on the Inventory → Products page to find the correct URL.
const PRODUCT_API_URL = "/api/inventory/products/"; // 👈 Change this!

type ProductMetric = {
  id: number;
  name: string;
  sku: string;
  category_name: string;
  quantity_sold: number;
  order_count: number;
  net_sales: number;
  product_cost: number;
  gross_profit: number;
  profit_margin: number;
  status: string;
};

type SortField =
  | "name"
  | "category_name"
  | "quantity_sold"
  | "order_count"
  | "net_sales"
  | "product_cost"
  | "gross_profit"
  | "profit_margin";
type SortDirection = "asc" | "desc";

export default function ProductPerformancePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductMetric[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("quantity_sold");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [error, setError] = useState<string | null>(null);

  const fetchProductPerformance = async () => {
    setLoading(true);
    setError(null);
    try {
      // ─── 1. Fetch all products using the configured endpoint ──────────────
      const productsRes = await apiFetch(`${PRODUCT_API_URL}?page_size=1000&ordering=name`, {}, true);
      const productsData = await productsRes.json();
      let allProducts = productsData.results || productsData.data || productsData;
      if (!Array.isArray(allProducts)) allProducts = [];
      console.log(`✅ Found ${allProducts.length} products`);

      if (!allProducts.length) {
        setProducts([]);
        setFilteredProducts([]);
        setLoading(false);
        return;
      }

      // ─── 2. Fetch all orders ──────────────────────────────────────────
      const ordersRes = await apiFetch(`/api/orders/?page_size=2000`, {}, true);
      const ordersData = await ordersRes.json();
      let allOrders = ordersData.results || ordersData.data || ordersData;
      if (!Array.isArray(allOrders)) allOrders = [];
      console.log(`✅ Found ${allOrders.length} orders`);

      // ─── 3. Filter for completed/delivered/paid orders ──────────────
      const completedStatuses = ['PAID', 'DELIVERED', 'COMPLETED'];
      const completedOrders = allOrders.filter((o: any) =>
        completedStatuses.includes(o.status?.toUpperCase())
      );
      console.log(`✅ Found ${completedOrders.length} completed orders`);

      // ─── 4. Build product metrics ──────────────────────────────────
      const metricsMap: Record<number, { qty: number; orders: Set<number> }> = {};
      completedOrders.forEach((order: any) => {
        (order.items || []).forEach((item: any) => {
          const productId = item.product;
          if (!productId) return;
          if (!metricsMap[productId]) {
            metricsMap[productId] = { qty: 0, orders: new Set() };
          }
          metricsMap[productId].qty += item.quantity || 1;
          metricsMap[productId].orders.add(order.id);
        });
      });

      // ─── 5. Compute final metrics ───────────────────────────────────
      const result: ProductMetric[] = allProducts.map((product: any) => {
        const metric = metricsMap[product.id] || { qty: 0, orders: new Set() };
        const net_sales = product.price * metric.qty;
        const cost = product.cost_price || product.price * 0.6;  // placeholder
        const product_cost = cost * metric.qty;
        const gross_profit = net_sales - product_cost;
        const profit_margin = net_sales > 0 ? (gross_profit / net_sales) * 100 : 0;

        return {
          id: product.id,
          name: product.name,
          sku: product.sku || "N/A",
          category_name: product.category_name || "Uncategorized",
          quantity_sold: metric.qty,
          order_count: metric.orders.size,
          net_sales: Math.round(net_sales * 100) / 100,
          product_cost: Math.round(product_cost * 100) / 100,
          gross_profit: Math.round(gross_profit * 100) / 100,
          profit_margin: Math.round(profit_margin * 100) / 100,
          status: product.is_active ? "Active" : "Inactive",
        };
      });

      setProducts(result);
      setFilteredProducts(result);
    } catch (error) {
      console.error("Failed to fetch product performance:", error);
      setError(
        `Unable to load products from endpoint: ${PRODUCT_API_URL}. Please check your inventory page's network tab for the correct URL and update the PRODUCT_API_URL constant in this file.`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProductPerformance();
  }, []);

  // ─── Search and sort ──────────────────────────────────────────────────
  useEffect(() => {
    let result = [...products];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.category_name.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      return sortDirection === "asc"
        ? Number(aVal) - Number(bVal)
        : Number(bVal) - Number(aVal);
    });

    setFilteredProducts(result);
  }, [products, searchTerm, sortField, sortDirection]);

  // ─── Metrics ──────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const soldProducts = products.filter((p) => p.quantity_sold > 0);
    const bestSeller = [...products].sort((a, b) => b.quantity_sold - a.quantity_sold)[0];
    const highestRevenue = [...products].sort((a, b) => b.net_sales - a.net_sales)[0];
    const mostProfitable = [...products].sort((a, b) => b.gross_profit - a.gross_profit)[0];
    const highestMargin = [...products].sort((a, b) => b.profit_margin - a.profit_margin)[0];
    const lowestSelling = [...products]
      .filter((p) => p.quantity_sold > 0)
      .sort((a, b) => a.quantity_sold - b.quantity_sold)[0];
    const unsoldCount = products.filter((p) => p.quantity_sold === 0).length;

    return {
      totalProducts,
      soldProducts: soldProducts.length,
      bestSeller,
      highestRevenue,
      mostProfitable,
      highestMargin,
      lowestSelling,
      unsoldCount,
    };
  }, [products]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatCurrency = (value: number) => `Rs. ${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <Minus className="h-3 w-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Product Performance</h1>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-6 text-center">
            <p className="text-red-400">⚠️ {error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>How to fix:</strong>
              <br />
              1. Open the <span className="font-mono">Inventory → Products</span> page.
              <br />
              2. Open Developer Tools (F12) → <span className="font-mono">Network</span> tab.
              <br />
              3. Refresh the page and look for the API request that fetches products.
              <br />
              4. Copy the URL path (e.g., <span className="font-mono">/api/products/</span>).
              <br />
              5. In <span className="font-mono">app/dashboard/reports/products/page.tsx</span>, update the <span className="font-mono">PRODUCT_API_URL</span> constant.
            </p>
            <Button variant="outline" className="mt-4" onClick={fetchProductPerformance}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Product Performance</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              fetchProductPerformance();
            }}
            disabled={refreshing}
            className="gap-1"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ─── Metrics Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-indigo-500/20">
              <Package className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Best Selling</p>
              <p className="text-sm font-semibold truncate">
                {metrics.bestSeller?.name || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.bestSeller ? `${metrics.bestSeller.quantity_sold} sold` : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-500/20">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Highest Revenue</p>
              <p className="text-sm font-semibold truncate">
                {metrics.highestRevenue?.name || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.highestRevenue ? formatCurrency(metrics.highestRevenue.net_sales) : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-purple-500/20">
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Most Profitable</p>
              <p className="text-sm font-semibold truncate">
                {metrics.mostProfitable?.name || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.mostProfitable ? formatCurrency(metrics.mostProfitable.gross_profit) : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-amber-500/20">
              <TrendingUp className="h-5 w-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Highest Margin</p>
              <p className="text-sm font-semibold truncate">
                {metrics.highestMargin?.name || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.highestMargin ? formatPercent(metrics.highestMargin.profit_margin) : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Secondary Metrics ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-rose-500/20">
              <TrendingDown className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lowest Selling</p>
              <p className="text-sm font-semibold">
                {metrics.lowestSelling?.name || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.lowestSelling ? `${metrics.lowestSelling.quantity_sold} sold` : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-500/5 border-slate-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-slate-500/20">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unsold Products</p>
              <p className="text-sm font-semibold">{metrics.unsoldCount}</p>
              <p className="text-xs text-muted-foreground">
                {metrics.totalProducts > 0
                  ? `${Math.round((metrics.unsoldCount / metrics.totalProducts) * 100)}% of total`
                  : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-cyan-500/20">
              <ShoppingBag className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Products</p>
              <p className="text-sm font-semibold">{metrics.totalProducts}</p>
              <p className="text-xs text-muted-foreground">
                {metrics.soldProducts} with sales
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Products Table ────────────────────────────────────────────── */}
      <Card className="border-border">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <h3 className="font-semibold text-foreground flex-1">Product Breakdown</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Product <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("category_name")}
                  >
                    <div className="flex items-center gap-1">
                      Category <SortIcon field="category_name" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("quantity_sold")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Qty Sold <SortIcon field="quantity_sold" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("order_count")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Orders <SortIcon field="order_count" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("net_sales")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Net Sales <SortIcon field="net_sales" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("product_cost")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Product Cost <SortIcon field="product_cost" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("gross_profit")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Gross Profit <SortIcon field="gross_profit" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("profit_margin")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Margin <SortIcon field="profit_margin" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      {searchTerm ? "No products match your search." : "No products found for your branch."}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        product.quantity_sold === 0 && "opacity-60"
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {product.name}
                        <span className="text-xs text-muted-foreground ml-2">({product.sku})</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {product.category_name}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {product.quantity_sold}
                      </td>
                      <td className="px-4 py-3 text-right">{product.order_count}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(product.net_sales)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatCurrency(product.product_cost)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-400">
                        {formatCurrency(product.gross_profit)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            product.profit_margin > 40
                              ? "bg-emerald-500/20 text-emerald-400"
                              : product.profit_margin > 20
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          )}
                        >
                          {formatPercent(product.profit_margin)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        <div className="p-3 border-t border-border text-xs text-muted-foreground flex justify-between">
          <span>
            Showing {filteredProducts.length} of {products.length} products
          </span>
          <span>
            {products.filter((p) => p.quantity_sold > 0).length} products with sales
          </span>
        </div>
      </Card>
    </div>
  );
}