// app/inventory/transactions/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import { canManageTransactions, getRoleName } from "@/lib/permissions";
import {
  getTransactions,
  createTransaction,
  getBranches,
  getIngredients,
  apiFetch
} from '@/lib/api';
import { Package, Plus, Search, X, CheckCircle, AlertCircle, Loader2, Store } from 'lucide-react';

interface Transaction {
  id: number;
  branch: number | { id: number; name: string };
  ingredient: number | { id: number; name: string; unit: string };
  transaction_type: string;
  quantity: string;
  unit: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  location: string | null;
  reason: string;
  performed_by: number | null;
  performed_by_name?: string;
  performed_by_username?: string;
  timestamp: string;
  branch_name?: string;
  ingredient_name?: string;
}

interface Branch {
  id: number;
  name: string;
}

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  current_stock: string;
  branch?: number;
}

const TRANSACTION_TYPES = [
  { value: 'purchase', label: 'Purchase', icon: '📦', color: 'emerald' },
  { value: 'usage', label: 'Usage', icon: '🔧', color: 'blue' },
  { value: 'waste', label: 'Waste', icon: '🗑️', color: 'red' },
  { value: 'transfer_in', label: 'Transfer In', icon: '📥', color: 'purple' },
  { value: 'transfer_out', label: 'Transfer Out', icon: '📤', color: 'orange' },
  { value: 'adjustment', label: 'Adjustment', icon: '⚖️', color: 'yellow' },
];

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', icon: '⏳', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  APPROVED: { label: 'Approved', icon: '✅', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  REJECTED: { label: 'Rejected', icon: '❌', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const InventoryTransactions: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validBranchId, setValidBranchId] = useState<number | null>(null);
  const [isBranchValidated, setIsBranchValidated] = useState(false);
  const [branchName, setBranchName] = useState<string>('');
  
  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    branch: '',
    ingredient: '',
    transaction_type: '',
    quantity: '',
    unit: '',
    status: 'APPROVED',
    location: '',
    reason: '',
  });

  // Check user permissions
  const canManage = user ? canManageTransactions(user) : false;
  const userRole = user ? getRoleName(user) : null;

  // ─── Fetch user profile and validate branch (same as DashboardOverview) ───
  useEffect(() => {
    const fetchUserProfileAndValidate = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First, fetch the user profile to get the branch
        console.log("📡 Fetching user profile for branch...");
        const res = await apiFetch('/api/users/profile/', {}, true);
        
        let profileBranchName = "";
        let profileBranchId = null;
        
        if (res.ok) {
          const profile = await res.json();
          console.log("📋 User profile from API:", profile);
          
          // Try different possible field names for branch
          if (profile.branch?.name) {
            profileBranchName = profile.branch.name;
            profileBranchId = profile.branch.id;
          } else if (profile.branch_name) {
            profileBranchName = profile.branch_name;
          } else if (profile.branch?.branch_name) {
            profileBranchName = profile.branch.branch_name;
          }
          
          console.log("✅ Found branch name in profile:", profileBranchName);
        } else {
          console.error("Failed to fetch profile:", res.status);
        }
        
        // Now fetch available branches
        console.log("🔍 Fetching available branches...");
        const branchData = await getBranches();
        const branchList = branchData.results || branchData || [];
        console.log("📋 Available branches:", branchList);
        
        if (branchList.length === 0) {
          setActionMsg({ type: 'error', text: 'No branches available in the system' });
          setLoading(false);
          return;
        }
        
        let selectedBranch = null;
        let selectedBranchName = "";
        
        // FIRST: Try to use branch from profile
        if (profileBranchName) {
          const matchedBranch = branchList.find((b: any) => 
            b.name?.toLowerCase() === profileBranchName.toLowerCase()
          );
          if (matchedBranch) {
            selectedBranch = matchedBranch;
            selectedBranchName = matchedBranch.name;
            console.log("✅ Using branch from profile:", selectedBranchName);
          } else {
            // If branch not in list, use the profile branch name
            selectedBranchName = profileBranchName;
            selectedBranch = branchList[0];
            console.log("📌 Using profile branch name (not in list):", selectedBranchName);
          }
        }
        
        // SECOND: Try by user's branch ID from auth
        if (!selectedBranch) {
          const userBranchId = (user as any)?.branch?.id;
          if (userBranchId) {
            const branchById = branchList.find((b: any) => b.id === userBranchId);
            if (branchById) {
              selectedBranch = branchById;
              selectedBranchName = branchById.name;
              console.log("✅ Using branch from user ID:", selectedBranchName);
            }
          }
        }
        
        // THIRD: Try by user's branch name from auth
        if (!selectedBranch) {
          const userBranchName = (user as any)?.branch?.name;
          if (userBranchName) {
            const branchByName = branchList.find((b: any) => 
              b.name?.toLowerCase() === userBranchName.toLowerCase()
            );
            if (branchByName) {
              selectedBranch = branchByName;
              selectedBranchName = branchByName.name;
              console.log("✅ Using branch from user name:", selectedBranchName);
            }
          }
        }
        
        // FINAL: Fallback to first branch
        if (!selectedBranch && branchList.length > 0) {
          selectedBranch = branchList[0];
          selectedBranchName = selectedBranch.name || "Default Branch";
          console.log("📌 Using first available branch as fallback:", selectedBranchName);
        }
        
        if (selectedBranch) {
          setValidBranchId(selectedBranch.id);
          setBranchName(selectedBranchName);
          setIsBranchValidated(true);
          console.log("✅ Final branch:", selectedBranchName);
          
          // Set form data branch
          setFormData(prev => ({
            ...prev,
            branch: selectedBranch.id.toString()
          }));
        } else {
          setActionMsg({ type: 'error', text: 'No valid branch found' });
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Failed to validate branch:", error);
        setActionMsg({ type: 'error', text: 'Failed to load branch data' });
        setLoading(false);
      }
    };

    if (user) {
      fetchUserProfileAndValidate();
    }
  }, [user]);

  // ─── Load ingredients after branch is validated ──────────────────────────
  useEffect(() => {
    if (isBranchValidated && validBranchId !== null) {
      loadIngredients();
      fetchTransactions();
    }
  }, [isBranchValidated, validBranchId]);

  // ─── Load branches ──────────────────────────────────────────────────────
  const loadBranches = async () => {
    try {
      const data = await getBranches();
      const branchList = data.results || data || [];
      setBranches(branchList);
      return branchList;
    } catch (error) {
      console.error('Error loading branches:', error);
      return [];
    }
  };

  // ─── Load ingredients ──────────────────────────────────────────────────
  const loadIngredients = async () => {
    try {
      const params: Record<string, string> = {};
      if (validBranchId) {
        params.branch = validBranchId.toString();
      }
      
      console.log('Fetching ingredients with params:', params);
      const data = await getIngredients(params);
      
      let ingredientsArray = [];
      if (Array.isArray(data)) {
        ingredientsArray = data;
      } else if (data?.results && Array.isArray(data.results)) {
        ingredientsArray = data.results;
      } else if (data?.data && Array.isArray(data.data)) {
        ingredientsArray = data.data;
      } else {
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key])) {
            ingredientsArray = data[key];
            break;
          }
        }
      }
      
      setIngredients(ingredientsArray);
      console.log('Ingredients loaded:', ingredientsArray);
      return ingredientsArray;
    } catch (error) {
      console.error('Error loading ingredients:', error);
      setIngredients([]);
      return [];
    }
  };

  // ─── Fetch transactions ────────────────────────────────────────────────
  const fetchTransactions = async () => {
    if (!validBranchId) {
      console.log('No valid branch found, waiting...');
      return;
    }
    
    setLoading(true);
    try {
      const params: Record<string, string> = {
        branch: validBranchId.toString(),
      };
      
      console.log('Fetching transactions for branch:', validBranchId);
      const data = await getTransactions(params);
      const transactionsArray = Array.isArray(data) ? data : 
                               data?.results ? data.results : [];
      
      // Create maps for faster lookups
      const branchMap = new Map<number, string>();
      branches.forEach(b => branchMap.set(b.id, b.name));
      
      const ingredientMap = new Map<number, string>();
      ingredients.forEach(i => ingredientMap.set(i.id, i.name));
      
      // Enrich transaction data with names
      const enrichedTransactions = transactionsArray.map((tx: any) => {
        let branchName = '';
        let ingredientName = '';
        let performedByName = '';
        
        // Handle branch
        if (typeof tx.branch === 'object' && tx.branch !== null) {
          branchName = tx.branch.name || `Branch #${tx.branch.id || '?'}`;
        } else if (tx.branch) {
          const branchId = typeof tx.branch === 'number' ? tx.branch : parseInt(tx.branch);
          branchName = branchMap.get(branchId) || `Branch #${branchId}`;
        }
        
        // Handle ingredient
        if (typeof tx.ingredient === 'object' && tx.ingredient !== null) {
          ingredientName = tx.ingredient.name || `Ingredient #${tx.ingredient.id || '?'}`;
        } else if (tx.ingredient) {
          const ingredientId = typeof tx.ingredient === 'number' ? tx.ingredient : parseInt(tx.ingredient);
          ingredientName = ingredientMap.get(ingredientId) || `Ingredient #${ingredientId}`;
        }
        
        // Handle performed_by
        if (typeof tx.performed_by === 'object' && tx.performed_by !== null) {
          performedByName = tx.performed_by.username || tx.performed_by.email || `User #${tx.performed_by.id || '?'}`;
        } else if (tx.performed_by) {
          performedByName = `User #${tx.performed_by}`;
        } else {
          performedByName = 'System';
        }
        
        return {
          ...tx,
          branch_name: branchName,
          ingredient_name: ingredientName,
          performed_by_name: performedByName,
        };
      });
      
      console.log('Enriched transactions:', enrichedTransactions);
      setTransactions(enrichedTransactions);
    } catch (error: any) {
      setActionMsg({ type: 'error', text: error?.detail || 'Failed to load transactions' });
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Load branches on component mount ──────────────────────────────────
  useEffect(() => {
    loadBranches();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      branch: validBranchId ? validBranchId.toString() : '',
      ingredient: '',
      transaction_type: '',
      quantity: '',
      unit: '',
      status: 'APPROVED',
      location: '',
      reason: '',
    });
  };

  // Open modal for create
  const openCreateModal = () => {
    if (!canManage) {
      setActionMsg({ type: 'error', text: "You don't have permission to create transactions." });
      return;
    }
    resetForm();
    loadIngredients();
    setShowModal(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManage) {
      setActionMsg({ type: 'error', text: "You don't have permission to perform this action." });
      return;
    }
    
    if (!formData.branch || !formData.ingredient || !formData.transaction_type || !formData.quantity || !formData.unit) {
      setActionMsg({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setFormLoading(true);
    try {
      const data = {
        branch: parseInt(formData.branch),
        ingredient: parseInt(formData.ingredient),
        transaction_type: formData.transaction_type,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        status: formData.status,
        location: formData.location || undefined,
        reason: formData.reason || '',
      };

      await createTransaction(data);
      setActionMsg({ type: 'success', text: 'Transaction created successfully!' });
      
      setShowModal(false);
      resetForm();
      fetchTransactions();
      loadIngredients();
    } catch (error: any) {
      setActionMsg({ type: 'error', text: error?.detail || error.message || 'Failed to save transaction.' });
    } finally {
      setFormLoading(false);
    }
  };

  // Filter data based on search
  const filteredData = transactions.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const typeLabel = TRANSACTION_TYPES.find(t => t.value === item.transaction_type)?.label || item.transaction_type;
    return (
      (item.ingredient_name || '').toLowerCase().includes(searchLower) ||
      (item.branch_name || '').toLowerCase().includes(searchLower) ||
      typeLabel.toLowerCase().includes(searchLower) ||
      item.reason.toLowerCase().includes(searchLower) ||
      (item.performed_by_name || '').toLowerCase().includes(searchLower)
    );
  });

  // Get transaction type info
  const getTypeInfo = (type: string) => {
    return TRANSACTION_TYPES.find(t => t.value === type) || { label: type, icon: '📋', color: 'gray' };
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
          <p className="text-muted-foreground mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-orange-500" />
            Inventory Transactions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all inventory movements for your branch.
            {userRole && (
              <span className="ml-2 text-xs bg-muted/30 px-2 py-1 rounded-lg border border-border">
                Role: {userRole.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          {canManage && (
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-foreground bg-orange-600 hover:bg-orange-700 shadow-[0_4px_16px_rgba(234,88,12,0.3)] transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Transaction
            </button>
          )}
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions..."
              className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-orange-500/70 focus:bg-muted/30 focus:ring-1 focus:ring-orange-500/70 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Branch Info - Same style as DashboardOverview */}
      <div className="flex items-center gap-2 rounded-full border px-3 py-2 w-fit" style={{ borderColor: "var(--page-border)", color: "var(--page-muted)" }}>
        <Store size={16} style={{ color: "var(--page-accent)" }} />
        <span className="text-sm font-medium" style={{ color: "var(--page-text)" }}>
          {branchName || "No Branch"}
        </span>
      </div>

      {/* Action Messages */}
      {actionMsg && (
        <div className={`px-4 py-3 rounded-xl border text-sm flex justify-between items-center ${
          actionMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400' 
            : 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400'
        }`}>
          <span className="flex items-center gap-2">
            {actionMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {actionMsg.text}
          </span>
          <button onClick={() => setActionMsg(null)} className="text-xl leading-none opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        /* Transactions Grid */
        <div className="grid grid-cols-1 gap-4">
          {filteredData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-muted/30 border border-border rounded-2xl">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              {searchTerm ? 'No transactions found matching your search.' : 'No transactions yet for your branch. Create your first transaction!'}
            </div>
          ) : (
            filteredData.map((item) => {
              const typeInfo = getTypeInfo(item.transaction_type);
              const statusInfo = STATUS_CONFIG[item.status];
              const isPositive = parseFloat(item.quantity) > 0;
              
              return (
                <div 
                  key={item.id} 
                  className="p-5 rounded-2xl border border-border bg-muted/30 backdrop-blur-md hover:border-orange-500/30 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{typeInfo.icon}</span>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            {typeInfo.label}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {item.ingredient_name || 'Unknown Ingredient'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-muted-foreground">
                          🏢 {item.branch_name || 'Unknown Branch'}
                        </span>
                        {item.location && (
                          <span className="text-muted-foreground">
                            📍 {item.location}
                          </span>
                        )}
                        {item.reason && (
                          <span className="text-muted-foreground text-xs truncate max-w-[200px]">
                            📝 {item.reason}
                          </span>
                        )}
                        <span className="text-muted-foreground text-xs">
                          👤 {item.performed_by_name || 'System'}
                        </span>
                      </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                      {/* Quantity */}
                      <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                        isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {isPositive ? '+' : ''}{item.quantity} {item.unit}
                      </div>

                      {/* Status */}
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </div>

                      {/* Date */}
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleDateString()}
                        <br />
                        <span className="text-[10px]">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>      
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Modal */}
      {showModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-border shadow-2xl p-6 md:p-8 animate-slideUp max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>
            
            <h2 className="text-2xl font-bold text-foreground mb-6 pr-8">
              New Transaction
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch - Auto-filled with user's branch name */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Branch *</label>
                  <div className="w-full px-4 py-2.5 bg-muted/30 border border-orange-500/30 rounded-xl text-foreground cursor-not-allowed flex items-center gap-2">
                    <Store className="h-4 w-4 text-orange-400" />
                    <span>{branchName || 'Your Branch'}</span>
                  </div>
                  <input
                    type="hidden"
                    value={formData.branch}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Transactions will be recorded for your branch
                  </p>
                </div>
                
                {/* Ingredient */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ingredient *</label>
                  <select
                    required
                    value={formData.ingredient}
                    onChange={(e) => setFormData({...formData, ingredient: e.target.value})}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-foreground outline-none focus:border-orange-500/50 focus:bg-muted/30 transition-all appearance-none"
                  >
                    <option value="">Select an ingredient</option>
                    {ingredients.length === 0 ? (
                      <option value="" disabled>No ingredients found for your branch</option>
                    ) : (
                      ingredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name} ({ingredient.unit})
                          {ingredient.current_stock && ` - Stock: ${ingredient.current_stock}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Transaction Type */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Transaction Type *</label>
                  <select
                    required
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({...formData, transaction_type: e.target.value})}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-foreground outline-none focus:border-orange-500/50 focus:bg-muted/30 transition-all appearance-none"
                  >
                    <option value="">Select type</option>
                    {TRANSACTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Quantity *</label>
                  <input
                    type="number"
                    required
                    step="0.001"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-foreground outline-none focus:border-orange-500/50 focus:bg-muted/30 transition-all"
                    placeholder="0.000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Positive = increase, negative = decrease</p>
                </div>

                {/* Unit */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Unit *</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-foreground outline-none focus:border-orange-500/50 focus:bg-muted/30 transition-all"
                    placeholder="kg, g, L, etc."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-foreground outline-none focus:border-orange-500/50 focus:bg-muted/30 transition-all appearance-none"
                  >
                    <option value="PENDING">⏳ Pending</option>
                    <option value="APPROVED">✅ Approved</option>
                    <option value="REJECTED">❌ Rejected</option>
                  </select>
                </div>

                {/* Location */}
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-foreground outline-none focus:border-orange-500/50 focus:bg-muted/30 transition-all"
                    placeholder="Shelf, cooler, storage area..."
                  />
                </div>

                {/* Reason */}
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Reason</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-foreground outline-none focus:border-orange-500/50 focus:bg-muted/30 transition-all resize-none"
                    placeholder="Reason for this transaction..."
                  />
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm text-foreground bg-orange-600 hover:bg-orange-700 transition-all shadow-[0_4px_16px_rgba(234,88,12,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Transaction'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm text-muted-foreground bg-slate-700/50 hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTransactions;