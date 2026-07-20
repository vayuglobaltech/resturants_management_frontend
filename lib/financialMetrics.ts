import { apiFetch } from "./api";

type ApiRecord = Record<string, unknown>;

export type DailyFinancialMetric = {
  date: string;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
};

export type ProductCostBreakdown = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  cogs: number;
  unitCost: number | null;
  missingCost: boolean;
};

export type FinancialMetrics = {
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  paidOrderCount: number;
  cancelledOrderCount: number;
  unitsSold: number;
  missingCostCount: number;
  missingCostProducts: string[];
  daily: DailyFinancialMetric[];
  products: ProductCostBreakdown[];
};

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === "object" && value !== null;

const recordsFrom = (value: unknown): ApiRecord[] => {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value) && Array.isArray(value.results)) return value.results.filter(isRecord);
  return [];
};

const numberFrom = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const positiveNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const identifier = (value: unknown): string | null => {
  if (typeof value === "number" || typeof value === "string") return String(value);
  if (isRecord(value) && (typeof value.id === "number" || typeof value.id === "string")) return String(value.id);
  return null;
};

const textFrom = (...values: unknown[]) => {
  const value = values.find((item) => typeof item === "string" && item.trim());
  return typeof value === "string" ? value.trim() : "";
};

const dateKey = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? fallback;
};

const status = (value: unknown) => String(value ?? "").trim().toLowerCase();

const getJson = async (path: string, optional = false): Promise<unknown> => {
  try {
    const response = await apiFetch(path, {}, true);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return response.json();
  } catch (error) {
    if (optional) return [];
    throw error;
  }
};

export async function calculateFinancialMetrics(
  startDate: string,
  endDate: string,
  branchId?: number,
): Promise<FinancialMetrics> {
  const branch = branchId ? `&branch=${branchId}` : "";
  const range = `created_at__gte=${startDate}&created_at__lte=${endDate}${branch}&page_size=2000`;

  const [ordersResponse, paymentsResponse, refundsResponse, menuResponse, productsResponse] =
    await Promise.all([
      getJson(`/api/orders/?${range}`),
      getJson(`/api/orders/payments/?status=COMPLETED&${range}`),
      getJson(`/api/orders/payments/?status__in=REFUNDED,PARTIALLY_REFUNDED&${range}`, true),
      getJson("/api/menu/?page_size=2000", true),
      getJson(`/api/inventory/products/?page_size=2000${branch}`, true),
    ]);

  const orders = recordsFrom(ordersResponse);
  const payments = recordsFrom(paymentsResponse);
  const refunds = recordsFrom(refundsResponse);
  const catalogue = [...recordsFrom(productsResponse), ...recordsFrom(menuResponse)];

  const costById = new Map<string, number>();
  const costBySku = new Map<string, number>();
  const costByName = new Map<string, number>();

  catalogue.forEach((product) => {
    const cost = positiveNumber(product.cost_price, product.unit_cost);
    if (cost === null) return;
    const id = identifier(product.id);
    const sku = textFrom(product.sku).toLowerCase();
    const name = textFrom(product.name).toLowerCase();
    if (id) costById.set(id, cost);
    if (sku) costBySku.set(sku, cost);
    if (name) costByName.set(name, cost);
  });

  const paidOrderIds = new Set(
    payments
      .map((payment) => identifier(payment.order ?? payment.order_id))
      .filter((id): id is string => id !== null),
  );

  orders.forEach((order) => {
    const orderId = identifier(order.id);
    const paymentStatus = status(order.payment_status);
    if (orderId && ["paid", "completed", "settled"].includes(paymentStatus)) paidOrderIds.add(orderId);
  });

  const refundsByDate = new Map<string, number>();
  let totalRefunds = 0;
  refunds.forEach((payment) => {
    const amount = numberFrom(payment.refunded_amount ?? payment.amount);
    const date = dateKey(payment.created_at, endDate);
    totalRefunds += amount;
    refundsByDate.set(date, (refundsByDate.get(date) ?? 0) + amount);
  });

  const dailyMap = new Map<string, Omit<DailyFinancialMetric, "date" | "netSales" | "grossProfit">>();
  const productMap = new Map<string, ProductCostBreakdown>();
  const missingNames = new Set<string>();
  let grossSales = 0;
  let discounts = 0;
  let cogs = 0;
  let unitsSold = 0;
  let missingCostCount = 0;

  orders.forEach((order) => {
    const orderId = identifier(order.id);
    if (!orderId || !paidOrderIds.has(orderId)) return;

    const date = dateKey(order.created_at, endDate);
    const daily = dailyMap.get(date) ?? { grossSales: 0, discounts: 0, refunds: 0, cogs: 0 };
    const items = recordsFrom(order.items);

    items.forEach((item) => {
      const product = isRecord(item.product) ? item.product : null;
      const menuItem = isRecord(item.menu_item) ? item.menu_item : null;
      const productId =
        identifier(item.product_id ?? item.product ?? item.menu_item_id ?? item.menu_item) ??
        (textFrom(item.sku, item.product_sku, item.product_name, item.name) || "unknown");
      const name = textFrom(item.product_name, item.name, product?.name, menuItem?.name) || `Product #${productId}`;
      const sku = textFrom(item.sku, item.product_sku, product?.sku, menuItem?.sku).toLowerCase();
      const quantity = Math.max(numberFrom(item.quantity), 0);
      const unitPrice = numberFrom(item.price_at_order ?? item.unit_price ?? item.price);
      const revenue = unitPrice * quantity;
      const unitCost = positiveNumber(
        item.cost_price_at_order,
        item.unit_cost,
        item.cost_price,
        product?.cost_price,
        menuItem?.cost_price,
        costById.get(productId),
        sku ? costBySku.get(sku) : null,
        costByName.get(name.toLowerCase()),
      );
      const itemCogs = (unitCost ?? 0) * quantity;

      grossSales += revenue;
      cogs += itemCogs;
      unitsSold += quantity;
      daily.grossSales += revenue;
      daily.cogs += itemCogs;

      if (unitCost === null && quantity > 0) {
        missingCostCount += 1;
        missingNames.add(name);
      }

      const existing = productMap.get(productId) ?? {
        productId,
        name,
        quantity: 0,
        revenue: 0,
        cogs: 0,
        unitCost,
        missingCost: unitCost === null,
      };
      existing.quantity += quantity;
      existing.revenue += revenue;
      existing.cogs += itemCogs;
      existing.missingCost = existing.missingCost || unitCost === null;
      productMap.set(productId, existing);
    });

    const orderDiscount = recordsFrom(order.discounts).reduce(
      (sum, discount) => sum + numberFrom(discount.amount),
      0,
    );
    discounts += orderDiscount;
    daily.discounts += orderDiscount;
    dailyMap.set(date, daily);
  });

  refundsByDate.forEach((amount, date) => {
    const daily = dailyMap.get(date) ?? { grossSales: 0, discounts: 0, refunds: 0, cogs: 0 };
    daily.refunds += amount;
    dailyMap.set(date, daily);
  });

  const netSales = grossSales - discounts - totalRefunds;
  const grossProfit = netSales - cogs;
  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      ...values,
      netSales: values.grossSales - values.discounts - values.refunds,
      grossProfit: values.grossSales - values.discounts - values.refunds - values.cogs,
    }));

  return {
    grossSales,
    discounts,
    refunds: totalRefunds,
    netSales,
    cogs,
    grossProfit,
    grossMargin: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
    paidOrderCount: paidOrderIds.size,
    cancelledOrderCount: orders.filter((order) => status(order.status) === "cancelled").length,
    unitsSold,
    missingCostCount,
    missingCostProducts: Array.from(missingNames).sort(),
    daily,
    products: Array.from(productMap.values()).sort((a, b) => b.cogs - a.cogs),
  };
}
