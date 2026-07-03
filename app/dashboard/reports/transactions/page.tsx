// app/reports/transactions/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Loader2,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  Package,
  FileText,
  RefreshCw,
  BarChart3,
  CreditCard,
  Plus,
  Minus,
  Truck,
  Trash2,
  RefreshCw as Adjustment,
  User,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { apiFetch, getTransactions, getIngredients, getBranches } from "@/lib/api";
import { listTables } from "@/lib/ordersApi";
import { format } from "date-fns";

// Types
interface PaymentTransaction {
  id: number;
  type: "payment";
  order: number | { id: number; order_number: string };
  amount: string;
  subtotal: string;
  tax: string;
  payment_method: "CASH" | "QR" | "CARD";
  status: "COMPLETED" | "PENDING" | "FAILED";
  transaction_id: string | null;
  customer_name: string;
  table: number | { id: number; table_number: string };
  branch: number | { id: number; name: string };
  performed_by: number | null | { id: number; username: string; email: string };
  timestamp: string;
  branch_name?: string;
  order_number?: string;
  table_number?: string;
  performed_by_name?: string;
}

interface InventoryTransaction {
  id: number;
  type: "inventory";
  branch: number | { id: number; name: string };
  ingredient: number | { id: number; name: string; unit: string };
  transaction_type: "purchase" | "usage" | "waste" | "transfer_in" | "transfer_out" | "adjustment";
  quantity: string;
  unit: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  location: string | null;
  reason: string;
  performed_by: number | null | { id: number; username: string; email: string };
  timestamp: string;
  branch_name?: string;
  ingredient_name?: string;
  performed_by_name?: string;
}

type Transaction = PaymentTransaction | InventoryTransaction;

interface Branch {
  id: number;
  name: string;
}

interface Ingredient {
  id: number;
  name: string;
  unit: string;
}

interface Table {
  id: number;
  table_number: string;
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  COMPLETED: { label: "Completed", icon: "✅", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  PENDING: { label: "Pending", icon: "⏳", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  FAILED: { label: "Failed", icon: "❌", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const INVENTORY_STATUS_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  PENDING: { label: "Pending", icon: "⏳", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  APPROVED: { label: "Approved", icon: "✅", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  REJECTED: { label: "Rejected", icon: "❌", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const INVENTORY_TYPES = [
  { value: "purchase", label: "Purchase", icon: "📦", color: "emerald" },
  { value: "usage", label: "Usage", icon: "🔧", color: "blue" },
  { value: "waste", label: "Waste", icon: "🗑️", color: "red" },
  { value: "transfer_in", label: "Transfer In", icon: "📥", color: "purple" },
  { value: "transfer_out", label: "Transfer Out", icon: "📤", color: "orange" },
  { value: "adjustment", label: "Adjustment", icon: "⚖️", color: "yellow" },
];

const PAYMENT_METHODS: Record<string, { label: string; icon: string }> = {
  CASH: { label: "Cash", icon: "💰" },
  QR: { label: "QR Code", icon: "📱" },
  CARD: { label: "Card", icon: "💳" },
};

// ─── Helper Functions ─────────────────────────────────────────────────────────
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "Invalid date";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return format(date, "MMM d, yyyy");
  } catch {
    return "Invalid date";
  }
};

const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "Invalid time";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid time";
    return format(date, "h:mm a");
  } catch {
    return "Invalid time";
  }
};

const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "Invalid date";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return format(date, "MMM d, yyyy h:mm a");
  } catch {
    return "Invalid date";
  }
};

export default function TransactionReportPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<"all" | "payments" | "inventory">("all");
  const [sortField, setSortField] = useState<keyof Transaction>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [userBranchId, setUserBranchId] = useState<number | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(true);
  
  // Filter states
  const [filters, setFilters] = useState({
    branch: "",
    ingredient: "",
    transaction_type: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    payment_method: "",
    table: "",
  });

  // Get user's branch from user object
  useEffect(() => {
    if (user) {
      let branchId = null;
      if (user.branch) {
        if (typeof user.branch === 'object' && 'id' in user.branch) {
          branchId = user.branch.id;
        } else if (typeof user.branch === 'number') {
          branchId = user.branch;
        }
      } else if (user.profile?.branch) {
        if (typeof user.profile.branch === 'object' && 'id' in user.profile.branch) {
          branchId = user.profile.branch.id;
        } else if (typeof user.profile.branch === 'number') {
          branchId = user.profile.branch;
        }
      } else if (user.role?.branch) {
        if (typeof user.role.branch === 'object' && 'id' in user.role.branch) {
          branchId = user.role.branch.id;
        } else if (typeof user.role.branch === 'number') {
          branchId = user.role.branch;
        }
      }
      
      if (branchId) {
        setUserBranchId(branchId);
        // Set filter to user's branch by default
        setFilters(prev => ({ ...prev, branch: String(branchId) }));
      }
    }
  }, [user]);

  // Load all data
  const loadData = async () => {
    setLoading(true);
    setLoadingBranches(true);
    try {
      // Load branches first
      console.log("🔄 Loading branches...");
      const branchesData = await getBranches();
      console.log("📊 Branches data received:", branchesData);
      
      let branchesArray = [];
      if (Array.isArray(branchesData)) {
        branchesArray = branchesData;
      } else if (branchesData?.results && Array.isArray(branchesData.results)) {
        branchesArray = branchesData.results;
      } else {
        // Try to extract any array from the response
        for (const key of Object.keys(branchesData || {})) {
          if (Array.isArray(branchesData[key])) {
            branchesArray = branchesData[key];
            break;
          }
        }
      }
      
      console.log("✅ Branches array:", branchesArray);
      setBranches(branchesArray);
      setLoadingBranches(false);

      // Load ingredients
      console.log("🔄 Loading ingredients...");
      const ingredientsData = await getIngredients();
      console.log("📊 Ingredients data:", ingredientsData);
      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : ingredientsData?.results || []);

      // Load tables
      console.log("🔄 Loading tables...");
      const tablesData = await listTables();
      console.log("📊 Tables data:", tablesData);
      setTables(Array.isArray(tablesData) ? tablesData : tablesData?.results || []);

      // Load transactions
      await fetchTransactions();
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const allTransactions: Transaction[] = [];
      
      // Create maps for lookups
      const branchMap = new Map<number, string>();
      branches.forEach((b: Branch) => branchMap.set(b.id, b.name));
      
      const ingredientMap = new Map<number, string>();
      ingredients.forEach((i: Ingredient) => ingredientMap.set(i.id, i.name));
      
      const tableMap = new Map<number, string>();
      tables.forEach((t: Table) => tableMap.set(t.id, t.table_number));

      // Use the branch filter from state
      const branchFilter = filters.branch;

      // 1. Fetch Payment Transactions
      try {
        let paymentUrl = "/api/orders/payments/";
        const params = new URLSearchParams();
        
        if (filters.dateFrom) params.append("date_from", filters.dateFrom);
        if (filters.dateTo) params.append("date_to", filters.dateTo);
        if (filters.status && filters.status !== "all" && filters.status !== "APPROVED" && filters.status !== "REJECTED") {
          params.append("status", filters.status);
        }
        if (filters.payment_method) params.append("payment_method", filters.payment_method);
        if (filters.table) params.append("table", filters.table);
        if (branchFilter) params.append("branch", branchFilter);
        
        if (params.toString()) paymentUrl += `?${params.toString()}`;

        console.log("Fetching payments with URL:", paymentUrl);

        const paymentRes = await apiFetch(paymentUrl, {}, true);
        if (paymentRes.ok) {
          const paymentData = await paymentRes.json();
          const paymentsArray = Array.isArray(paymentData) ? paymentData : paymentData?.results || [];
          
          const enrichedPayments: PaymentTransaction[] = paymentsArray.map((p: any) => ({
            ...p,
            type: "payment",
            branch_name: typeof p.branch === "object" ? p.branch?.name : branchMap.get(p.branch) || "Unknown Branch",
            order_number: typeof p.order === "object" ? p.order?.order_number : `Order #${p.order}`,
            table_number: typeof p.table === "object" ? `Table ${p.table?.table_number}` : tableMap.get(p.table) || `Table #${p.table}`,
            performed_by_name: typeof p.performed_by === "object" ? p.performed_by?.username || p.performed_by?.email : "System",
          }));

          allTransactions.push(...enrichedPayments);
        }
      } catch (error) {
        console.error("Error fetching payments:", error);
      }

      // 2. Fetch Inventory Transactions
      try {
        const inventoryParams: Record<string, string> = {};
        
        if (branchFilter) inventoryParams.branch = branchFilter;
        if (filters.ingredient) inventoryParams.ingredient = filters.ingredient;
        if (filters.transaction_type && filters.transaction_type !== "all") {
          inventoryParams.transaction_type = filters.transaction_type;
        }
        if (filters.status && filters.status !== "all" && filters.status !== "COMPLETED" && filters.status !== "FAILED") {
          inventoryParams.status = filters.status;
        }
        if (filters.dateFrom) inventoryParams.date_from = filters.dateFrom;
        if (filters.dateTo) inventoryParams.date_to = filters.dateTo;

        console.log("Fetching inventory with params:", inventoryParams);

        const inventoryData = await getTransactions(inventoryParams);
        const inventoryArray = Array.isArray(inventoryData) ? inventoryData : inventoryData?.results || [];
        
        const enrichedInventory: InventoryTransaction[] = inventoryArray.map((i: any) => ({
          ...i,
          type: "inventory",
          branch_name: typeof i.branch === "object" ? i.branch?.name : branchMap.get(i.branch) || "Unknown Branch",
          ingredient_name: typeof i.ingredient === "object" ? i.ingredient?.name : ingredientMap.get(i.ingredient) || "Unknown Ingredient",
          performed_by_name: typeof i.performed_by === "object" ? i.performed_by?.username || i.performed_by?.email : "System",
        }));

        allTransactions.push(...enrichedInventory);
      } catch (error) {
        console.error("Error fetching inventory transactions:", error);
      }

      // Sort by timestamp (newest first)
      allTransactions.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA;
      });

      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to fetch transactions");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (!loading) {
        fetchTransactions();
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [
    filters.branch,
    filters.ingredient,
    filters.transaction_type,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.payment_method,
    filters.table,
  ]);

  // Filter and sort transactions (client-side filtering as backup)
  const filteredAndSorted = useMemo(() => {
    let result = [...transactions];

    // Filter by transaction type (payment/inventory)
    if (transactionTypeFilter !== "all") {
      result = result.filter(tx => tx.type === transactionTypeFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter((tx) => {
        if (tx.type === "payment") {
          const p = tx as PaymentTransaction;
          return (
            (p.customer_name || "").toLowerCase().includes(search) ||
            (p.order_number || "").toLowerCase().includes(search) ||
            (p.table_number || "").toLowerCase().includes(search) ||
            (p.transaction_id || "").toLowerCase().includes(search) ||
            (p.performed_by_name || "").toLowerCase().includes(search) ||
            (p.branch_name || "").toLowerCase().includes(search)
          );
        } else {
          const i = tx as InventoryTransaction;
          return (
            (i.ingredient_name || "").toLowerCase().includes(search) ||
            (i.reason || "").toLowerCase().includes(search) ||
            (i.location || "").toLowerCase().includes(search) ||
            (i.performed_by_name || "").toLowerCase().includes(search) ||
            (i.branch_name || "").toLowerCase().includes(search)
          );
        }
      });
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "timestamp") {
        aVal = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        bVal = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      }

      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [transactions, searchTerm, sortField, sortDirection, transactionTypeFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = transactions.length;
    const payments = transactions.filter(t => t.type === "payment").length;
    const inventory = transactions.filter(t => t.type === "inventory").length;
    
    const completedPayments = transactions.filter(
      t => t.type === "payment" && (t as PaymentTransaction).status === "COMPLETED"
    ).length;
    const totalAmount = transactions
      .filter(t => t.type === "payment" && (t as PaymentTransaction).status === "COMPLETED")
      .reduce((sum, t) => sum + parseFloat((t as PaymentTransaction).amount || "0"), 0);

    const approvedInventory = transactions.filter(
      t => t.type === "inventory" && (t as InventoryTransaction).status === "APPROVED"
    ).length;
    const pendingInventory = transactions.filter(
      t => t.type === "inventory" && (t as InventoryTransaction).status === "PENDING"
    ).length;

    return { total, payments, inventory, completedPayments, totalAmount, approvedInventory, pendingInventory };
  }, [transactions]);

  // Export to CSV
  const exportCSV = async () => {
    setExporting(true);
    try {
      const headers = ["ID", "Type", "Branch", "Details", "Amount/Quantity", "Status", "Performed By", "Date"];
      const rows = filteredAndSorted.map((tx) => {
        if (tx.type === "payment") {
          const p = tx as PaymentTransaction;
          return [
            p.id,
            "Payment",
            p.branch_name || "",
            `${p.customer_name || "Guest"} - ${p.order_number || ""} (${p.table_number || ""})`,
            `$${p.amount || "0.00"}`,
            p.status || "UNKNOWN",
            p.performed_by_name || "",
            tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "Invalid date",
          ];
        } else {
          const i = tx as InventoryTransaction;
          return [
            i.id,
            "Inventory",
            i.branch_name || "",
            `${i.ingredient_name || ""} - ${i.transaction_type || "UNKNOWN"}`,
            `${i.quantity || "0"} ${i.unit || ""}`,
            i.status || "UNKNOWN",
            i.performed_by_name || "",
            tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "Invalid date",
          ];
        }
      });

      const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("CSV exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  // Handle sort
  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      branch: userBranchId ? String(userBranchId) : "",
      ingredient: "",
      transaction_type: "",
      status: "",
      dateFrom: "",
      dateTo: "",
      payment_method: "",
      table: "",
    });
    setSearchTerm("");
    setTransactionTypeFilter("all");
  };

  // Get status config
  const getStatusConfig = (tx: Transaction) => {
    if (tx.type === "payment") {
      const p = tx as PaymentTransaction;
      return PAYMENT_STATUS_CONFIG[p.status] || PAYMENT_STATUS_CONFIG.COMPLETED;
    } else {
      const i = tx as InventoryTransaction;
      return INVENTORY_STATUS_CONFIG[i.status] || INVENTORY_STATUS_CONFIG.APPROVED;
    }
  };

  // Get type label
  const getTypeLabel = (tx: Transaction) => {
    if (tx.type === "payment") {
      return "💰 Payment";
    } else {
      const i = tx as InventoryTransaction;
      const typeInfo = INVENTORY_TYPES.find(t => t.value === i.transaction_type);
      return typeInfo ? `${typeInfo.icon} ${typeInfo.label}` : "📦 Inventory";
    }
  };

  // Get transaction icon
  const getTransactionIcon = (tx: Transaction) => {
    if (tx.type === "payment") {
      return <CreditCard className="h-5 w-5 text-emerald-400" />;
    } else {
      const i = tx as InventoryTransaction;
      switch (i.transaction_type) {
        case "purchase": return <Plus className="h-5 w-5 text-emerald-400" />;
        case "usage": return <Minus className="h-5 w-5 text-blue-400" />;
        case "waste": return <Trash2 className="h-5 w-5 text-red-400" />;
        case "transfer_in": return <Truck className="h-5 w-5 text-purple-400" />;
        case "transfer_out": return <Truck className="h-5 w-5 text-orange-400" />;
        case "adjustment": return <Adjustment className="h-5 w-5 text-yellow-400" />;
        default: return <Package className="h-5 w-5 text-slate-400" />;
      }
    }
  };

  // Get transaction details for display
  const getTransactionDetails = (tx: Transaction) => {
    if (tx.type === "payment") {
      const p = tx as PaymentTransaction;
      return {
        title: p.customer_name || "Guest",
        subtitle: p.order_number || `Order #${p.order}`,
        extra: p.table_number || `Table #${p.table}`,
        amount: p.amount ? `$${p.amount}` : "$0.00",
        method: p.payment_method ? PAYMENT_METHODS[p.payment_method]?.label || p.payment_method : "N/A",
        transactionId: p.transaction_id || "N/A",
      };
    } else {
      const i = tx as InventoryTransaction;
      return {
        title: i.ingredient_name || "Unknown Ingredient",
        subtitle: i.transaction_type ? i.transaction_type.replace("_", " ").toUpperCase() : "UNKNOWN",
        extra: i.location || "No location",
        amount: i.quantity && i.unit ? `${i.quantity} ${i.unit}` : "0",
        method: "N/A",
        transactionId: i.reason || "No reason",
      };
    }
  };

  // View transaction details
  const viewDetails = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setShowDetailModal(true);
  };

  // Get branch name for display
  const getBranchName = (branchId: string | number) => {
    const id = typeof branchId === 'string' ? parseInt(branchId) : branchId;
    const branch = branches.find(b => b.id === id);
    return branch?.name || 'All Branches';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/5 gap-2 transition-all">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="h-7 w-7 text-indigo-400" />
                Transaction Report
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                View all payments and inventory transactions 
                {filters.branch && branches.length > 0 && ` • ${getBranchName(filters.branch)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={exportCSV}
              disabled={exporting || filteredAndSorted.length === 0}
              className="gap-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export CSV
            </Button>
            <Button
              onClick={loadData}
              className="gap-2 bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-slate-400 text-xs">Total</p>
              <p className="text-white text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/10 border-emerald-500/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-emerald-400 text-xs">Payments</p>
              <p className="text-emerald-400 text-2xl font-bold">{stats.payments}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-blue-400 text-xs">Inventory</p>
              <p className="text-blue-400 text-2xl font-bold">{stats.inventory}</p>
            </CardContent>
          </Card>
          <Card className="bg-indigo-500/10 border-indigo-500/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-indigo-400 text-xs">Completed</p>
              <p className="text-indigo-400 text-2xl font-bold">{stats.completedPayments}</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-yellow-400 text-xs">Pending</p>
              <p className="text-yellow-400 text-2xl font-bold">{stats.pendingInventory}</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-purple-400 text-xs">Approved</p>
              <p className="text-purple-400 text-2xl font-bold">{stats.approvedInventory}</p>
            </CardContent>
          </Card>
          <Card className="bg-rose-500/10 border-rose-500/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-rose-400 text-xs">Revenue</p>
              <p className="text-rose-400 text-2xl font-bold">${stats.totalAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500/50"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={transactionTypeFilter}
                  onChange={(e) => setTransactionTypeFilter(e.target.value as "all" | "payments" | "inventory")}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                >
                  <option value="all" className="text-black">All Types</option>
                  <option value="payments" className="text-black">💰 Payments</option>
                  <option value="inventory" className="text-black">📦 Inventory</option>
                </select>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2 border-white/10 text-slate-300 hover:bg-white/10"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? "Hide" : "Show"} Filters
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-4 border-t border-white/10">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Branch</label>
                  {loadingBranches ? (
                    <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-sm flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading branches...
                    </div>
                  ) : (
                    <select
                      value={filters.branch}
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log("Branch filter changed to:", value);
                        setFilters({ ...filters, branch: value });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                    >
                      <option value="" className="text-black">🌐 All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id} className="text-black">
                          🏢 {b.name} {b.id === userBranchId ? " (Your Branch)" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Ingredient</label>
                  <select
                    value={filters.ingredient}
                    onChange={(e) => setFilters({ ...filters, ingredient: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="" className="text-black">All Ingredients</option>
                    {ingredients.map((i) => (
                      <option key={i.id} value={i.id} className="text-black">{i.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Inventory Type</label>
                  <select
                    value={filters.transaction_type}
                    onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="all" className="text-black">All Types</option>
                    {INVENTORY_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="text-black">{t.icon} {t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Payment Method</label>
                  <select
                    value={filters.payment_method}
                    onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="" className="text-black">All Methods</option>
                    {Object.entries(PAYMENT_METHODS).map(([key, value]) => (
                      <option key={key} value={key} className="text-black">{value.icon} {value.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Table</label>
                  <select
                    value={filters.table}
                    onChange={(e) => setFilters({ ...filters, table: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="" className="text-black">All Tables</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id} className="text-black">Table {t.table_number}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="all" className="text-black">All Status</option>
                    <option value="COMPLETED" className="text-black">✅ Completed</option>
                    <option value="PENDING" className="text-black">⏳ Pending</option>
                    <option value="FAILED" className="text-black">❌ Failed</option>
                    <option value="APPROVED" className="text-black">✅ Approved</option>
                    <option value="REJECTED" className="text-black">❌ Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Date From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Date To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>

                <Button
                  onClick={resetFilters}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white hover:bg-white/10 col-span-full md:col-span-1"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                <span className="ml-3 text-slate-400">Loading transactions...</span>
              </div>
            ) : filteredAndSorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FileText className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">No transactions found</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Type</th>
                    <th onClick={() => handleSort("id")} className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white transition-colors">
                      ID {sortField === "id" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th onClick={() => handleSort("branch_name")} className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white transition-colors">
                      Branch {sortField === "branch_name" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Details</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium">Amount/Qty</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Performed By</th>
                    <th onClick={() => handleSort("timestamp")} className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white transition-colors">
                      Date {sortField === "timestamp" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="px-4 py-3 text-center text-slate-400 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map((tx) => {
                    const statusConfig = getStatusConfig(tx);
                    const details = getTransactionDetails(tx);
                    const isPositive = tx.type === "inventory" && parseFloat((tx as InventoryTransaction).quantity || "0") > 0;

                    return (
                      <tr key={`${tx.type}-${tx.id}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(tx)}
                            <span className="text-xs text-slate-400">{getTypeLabel(tx)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white font-mono text-xs">
                          #{tx.id}
                        </td>
                        <td className="px-4 py-3 text-white">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{tx.branch_name || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{details.title}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>{details.subtitle}</span>
                            {tx.type === "payment" && (
                              <span className="text-slate-500">{details.method}</span>
                            )}
                            {tx.type === "inventory" && (
                              <span className="text-slate-500">{details.extra}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tx.type === "payment" ? (
                            <span className="text-emerald-400 font-bold">{details.amount}</span>
                          ) : (
                            <span className={`font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                              {isPositive ? "+" : ""}{details.amount}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusConfig.color}`}>
                            {statusConfig.icon} {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-xs">{tx.performed_by_name || "System"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            <span>{formatDate(tx.timestamp)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {formatTime(tx.timestamp)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewDetails(tx)}
                            className="text-slate-400 hover:text-white hover:bg-white/10"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div>
            Showing {filteredAndSorted.length} of {transactions.length} transactions
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-slate-400 hover:text-white hover:bg-white/5"
            >
              Back to Top ↑
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-white/10 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              {getTransactionIcon(selectedTransaction)}
              <h2 className="text-2xl font-bold text-white">
                {selectedTransaction.type === "payment" ? "Payment Details" : "Inventory Transaction Details"}
              </h2>
            </div>

            {selectedTransaction.type === "payment" ? (
              <PaymentDetailView transaction={selectedTransaction as PaymentTransaction} />
            ) : (
              <InventoryDetailView transaction={selectedTransaction as InventoryTransaction} />
            )}

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setShowDetailModal(false)}
                className="bg-white/10 text-white hover:bg-white/20 border border-white/10"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Payment Detail Component
function PaymentDetailView({ transaction }: { transaction: PaymentTransaction }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-slate-400 text-xs">Customer</p>
          <p className="text-white font-medium">{transaction.customer_name || "Guest"}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Order Number</p>
          <p className="text-white font-medium">{transaction.order_number || `#${transaction.order}`}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Table</p>
          <p className="text-white font-medium">{transaction.table_number || `#${transaction.table}`}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Payment Method</p>
          <p className="text-white font-medium">
            {transaction.payment_method ? PAYMENT_METHODS[transaction.payment_method]?.label || transaction.payment_method : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Amount</p>
          <p className="text-emerald-400 font-bold text-lg">${transaction.amount || "0.00"}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Status</p>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${PAYMENT_STATUS_CONFIG[transaction.status]?.color || ""}`}>
            {PAYMENT_STATUS_CONFIG[transaction.status]?.icon} {transaction.status || "UNKNOWN"}
          </span>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Transaction ID</p>
          <p className="text-white font-mono text-sm">{transaction.transaction_id || "N/A"}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Date</p>
          <p className="text-white">{formatDateTime(transaction.timestamp)}</p>
        </div>
      </div>
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <p className="text-slate-400 text-xs mb-1">Subtotal</p>
        <p className="text-white">${transaction.subtotal || "0.00"}</p>
        <p className="text-slate-400 text-xs mt-2 mb-1">Tax</p>
        <p className="text-white">${transaction.tax || "0.00"}</p>
      </div>
    </div>
  );
}

// Inventory Detail Component
function InventoryDetailView({ transaction }: { transaction: InventoryTransaction }) {
  const typeInfo = INVENTORY_TYPES.find(t => t.value === transaction.transaction_type);
  const isPositive = parseFloat(transaction.quantity || "0") > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-slate-400 text-xs">Ingredient</p>
          <p className="text-white font-medium">{transaction.ingredient_name || "Unknown"}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Type</p>
          <p className="text-white font-medium">
            {typeInfo ? `${typeInfo.icon} ${typeInfo.label}` : transaction.transaction_type || "UNKNOWN"}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Quantity</p>
          <p className={`font-bold text-lg ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{transaction.quantity || "0"} {transaction.unit || ""}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Status</p>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${INVENTORY_STATUS_CONFIG[transaction.status]?.color || ""}`}>
            {INVENTORY_STATUS_CONFIG[transaction.status]?.icon} {transaction.status || "UNKNOWN"}
          </span>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Location</p>
          <p className="text-white">{transaction.location || "N/A"}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Date</p>
          <p className="text-white">{formatDateTime(transaction.timestamp)}</p>
        </div>
      </div>
      {transaction.reason && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-slate-400 text-xs mb-1">Reason</p>
          <p className="text-white">{transaction.reason}</p>
        </div>
      )}
    </div>
  );
}