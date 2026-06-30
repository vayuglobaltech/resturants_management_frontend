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
  getProfile
} from '@/lib/api';

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

// Extended user type with branch property
interface ExtendedUser {
  id?: number;
  username?: string;
  email?: string;
  branch?: number | { id: number; name: string };
  profile?: {
    branch?: number | { id: number; name: string };
  };
  role?: {
    id?: number;
    name?: string;
    branch?: number | { id: number; name: string };
  };
  is_superuser?: boolean;
  is_staff?: boolean;
  [key: string]: any;
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
  const [userBranch, setUserBranch] = useState<number | null>(null);
  const [userBranchName, setUserBranchName] = useState<string>('');
  
  // Filter states
  const [filters, setFilters] = useState({
    branch: '',
    ingredient: '',
    transaction_type: '',
    status: '',
  });

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

  // Get user's branch from user object
  const getUserBranch = (): number | null => {
    if (!user) return null;
    
    const extendedUser = user as ExtendedUser;
    
    // Check if user has branch directly
    if (extendedUser.branch) {
      if (typeof extendedUser.branch === 'object' && 'id' in extendedUser.branch) {
        return extendedUser.branch.id;
      }
      if (typeof extendedUser.branch === 'number') {
        return extendedUser.branch;
      }
    }
    
    // Check if user has branch in profile
    if (extendedUser.profile && extendedUser.profile.branch) {
      if (typeof extendedUser.profile.branch === 'object' && 'id' in extendedUser.profile.branch) {
        return extendedUser.profile.branch.id;
      }
      if (typeof extendedUser.profile.branch === 'number') {
        return extendedUser.profile.branch;
      }
    }
    
    // Check if user has branch in role
    if (extendedUser.role && extendedUser.role.branch) {
      if (typeof extendedUser.role.branch === 'object' && 'id' in extendedUser.role.branch) {
        return extendedUser.role.branch.id;
      }
      if (typeof extendedUser.role.branch === 'number') {
        return extendedUser.role.branch;
      }
    }
    
    return null;
  };

  // Load user's branch from the API
  const loadUserBranch = async () => {
    try {
      // First try to get from user object
      const userBranchId = getUserBranch();
      if (userBranchId) {
        setUserBranch(userBranchId);
        console.log('User branch found in user object:', userBranchId);
        return userBranchId;
      }

      // If not found in user object, fetch from API
      const userData = await getProfile();
      console.log('User profile data from API:', userData);
      
      // Extract branch from user data
      let fetchedBranchId = null;
      if (userData.branch) {
        if (typeof userData.branch === 'object' && 'id' in userData.branch) {
          fetchedBranchId = userData.branch.id;
        } else if (typeof userData.branch === 'number') {
          fetchedBranchId = userData.branch;
        }
      } else if (userData.profile?.branch) {
        if (typeof userData.profile.branch === 'object' && 'id' in userData.profile.branch) {
          fetchedBranchId = userData.profile.branch.id;
        } else if (typeof userData.profile.branch === 'number') {
          fetchedBranchId = userData.profile.branch;
        }
      } else if (userData.branch_id) {
        fetchedBranchId = userData.branch_id;
      }
      
      if (fetchedBranchId) {
        setUserBranch(fetchedBranchId);
        return fetchedBranchId;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading user branch:', error);
      return null;
    }
  };

  // Load branches
  const loadBranches = async () => {
    try {
      const data = await getBranches();
      console.log('Branches response:', data);
      
      let branchesArray = [];
      if (Array.isArray(data)) {
        branchesArray = data;
      } else if (data?.results && Array.isArray(data.results)) {
        branchesArray = data.results;
      } else if (data?.data && Array.isArray(data.data)) {
        branchesArray = data.data;
      } else {
        // Try to extract any array from the response
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key])) {
            branchesArray = data[key];
            break;
          }
        }
      }
      
      if (branchesArray.length > 0) {
        setBranches(branchesArray);
        
        // Set user's branch name
        if (userBranch) {
          const branch = branchesArray.find((b: Branch) => b.id === userBranch);
          if (branch) {
            setUserBranchName(branch.name);
          }
        }
        
        console.log('Branches loaded:', branchesArray);
        return branchesArray;
      }
      
      return [];
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
      return [];
    }
  };

  // Load ingredients - fetch based on user's branch
  const loadIngredients = async (branchId?: number) => {
    try {
      const branchToUse = branchId || userBranch;
      
      // Build params with branch filter if available
      const params: Record<string, string> = {};
      if (branchToUse) {
        params.branch = branchToUse.toString();
      }
      
      console.log('Fetching ingredients with params:', params);
      
      const data = await getIngredients(params);
      console.log('Ingredients response:', data);
      
      let ingredientsArray = [];
      if (Array.isArray(data)) {
        ingredientsArray = data;
      } else if (data?.results && Array.isArray(data.results)) {
        ingredientsArray = data.results;
      } else if (data?.data && Array.isArray(data.data)) {
        ingredientsArray = data.data;
      } else {
        // Try to extract any array from the response
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key])) {
            ingredientsArray = data[key];
            break;
          }
        }
      }
      
      if (ingredientsArray.length > 0) {
        setIngredients(ingredientsArray);
        console.log('Ingredients loaded:', ingredientsArray);
      } else {
        console.log('No ingredients found for branch:', branchToUse);
        setIngredients([]);
      }
      return ingredientsArray;
    } catch (error) {
      console.error('Error loading ingredients:', error);
      setIngredients([]);
      return [];
    }
  };

  // Fetch transactions with filters
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      
      // If user has a branch, filter by it by default
      if (userBranch && !filters.branch) {
        params.branch = userBranch.toString();
      }
      
      if (filters.branch) params.branch = filters.branch;
      if (filters.ingredient) params.ingredient = filters.ingredient;
      if (filters.transaction_type) params.transaction_type = filters.transaction_type;
      if (filters.status) params.status = filters.status;
      
      console.log('Fetching transactions with params:', params); 
      const data = await getTransactions(params);
      const transactionsArray = Array.isArray(data) ? data : 
                               data?.results ? data.results : [];
      
      console.log('Raw transactions data:', transactionsArray);
      
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
        
        // Handle performed_by (who created the transaction)
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

  // Initial data load
  const fetchData = async () => {
    try {
      // First load user's branch
      const loadedBranchId = await loadUserBranch();
      console.log('Loaded branch ID:', loadedBranchId);
      
      // Load branches and wait for them to complete
      const loadedBranches = await loadBranches();
      console.log('Branches loaded in fetchData:', loadedBranches);
      
      // Load ingredients for user's branch and wait for them to complete
      const loadedIngredients = await loadIngredients(loadedBranchId || undefined);
      console.log('Ingredients loaded in fetchData:', loadedIngredients);
      
      // Set filter to user's branch
      if (loadedBranchId) {
        setFilters(prev => ({ ...prev, branch: loadedBranchId.toString() }));
      }
      
      // Now fetch transactions with all data loaded
      await fetchTransactions();
    } catch (error) {
      console.error('Error in fetchData:', error);
      setActionMsg({ type: 'error', text: 'Failed to load data. Please refresh the page.' });
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user]);

  // Refetch when filters change
  useEffect(() => {
    if (!authLoading && user && branches.length > 0) {
      fetchTransactions();
    }
  }, [filters.branch, filters.ingredient, filters.transaction_type, filters.status]);

  // Reset form
  const resetForm = () => {
    setFormData({
      branch: userBranch ? userBranch.toString() : '',
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
    // Refresh ingredients when opening modal
    loadIngredients(userBranch || undefined);
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
          <span className="w-8 h-8 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin inline-block" />
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="animate-fadeUp">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Inventory Transactions</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Track all inventory movements across branches.
            {userRole && (
              <span className="ml-2 text-xs bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                Role: {userRole.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {userBranchName && (
              <span className="ml-2 text-xs bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 text-blue-400">
                Branch: {userBranchName}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          {canManage && (
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-orange-600 hover:bg-orange-700 shadow-[0_4px_16px_rgba(234,88,12,0.3)] transition-all"
            >
              + New Transaction
            </button>
          )}
          
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions..."
              className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-500 text-sm focus:border-orange-500/70 focus:bg-white/[0.06] focus:ring-1 focus:ring-orange-500/70 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={filters.branch}
            onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value }))}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-100 text-sm focus:border-orange-500/70 focus:bg-white/[0.06] focus:ring-1 focus:ring-orange-500/70 outline-none transition-all"
          >
            <option value="" className="text-black">All Branches</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id} className="text-black">
                {branch.name} {branch.id === userBranch ? '(Your Branch)' : ''}
              </option>
            ))}
          </select>

          <select
            value={filters.ingredient}
            onChange={(e) => setFilters(prev => ({ ...prev, ingredient: e.target.value }))}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-100 text-sm focus:border-orange-500/70 focus:bg-white/[0.06] focus:ring-1 focus:ring-orange-500/70 outline-none transition-all"
          >
            <option value="" className="text-black">All Ingredients</option>
            {ingredients.map(ingredient => (
              <option key={ingredient.id} value={ingredient.id} className="text-black">
                {ingredient.name} ({ingredient.unit}) {ingredient.current_stock && `- Stock: ${ingredient.current_stock}`}
              </option>
            ))}
          </select>

          <select
            value={filters.transaction_type}
            onChange={(e) => setFilters(prev => ({ ...prev, transaction_type: e.target.value }))}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-100 text-sm focus:border-orange-500/70 focus:bg-white/[0.06] focus:ring-1 focus:ring-orange-500/70 outline-none transition-all"
          >
            <option value="" className="text-black">All Types</option>
            {TRANSACTION_TYPES.map(type => (
              <option key={type.value} value={type.value} className="text-black">{type.icon} {type.label}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-100 text-sm focus:border-orange-500/70 focus:bg-white/[0.06] focus:ring-1 focus:ring-orange-500/70 outline-none transition-all"
          >
            <option value="" className="text-black">All Status</option>
            <option value="PENDING" className="text-black">⏳ Pending</option>
            <option value="APPROVED" className="text-black">✅ Approved</option>
            <option value="REJECTED" className="text-black">❌ Rejected</option>
          </select>
        </div>
      </div>

      {/* Action Messages */}
      {actionMsg && (
        <div className={`mb-6 px-4 py-3 rounded-xl border text-sm animate-fadeDown flex justify-between items-center ${
          actionMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/25 text-red-400'
        }`}>
          <span>{actionMsg.type === 'success' ? '✅ ' : '⚠️ '} {actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-xl leading-none opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
        </div>
      ) : (
        /* Transactions Grid */
        <div className="grid grid-cols-1 gap-4">
          {filteredData.length === 0 ? (
            <div className="py-10 text-center text-slate-500 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              {searchTerm || Object.values(filters).some(f => f) ? 'No transactions found matching your filters.' : 'No transactions yet. Create your first transaction!'}
            </div>
          ) : (
            filteredData.map((item) => {
              const typeInfo = getTypeInfo(item.transaction_type);
              const statusInfo = STATUS_CONFIG[item.status];
              const isPositive = parseFloat(item.quantity) > 0;
              
              return (
                <div 
                  key={item.id} 
                  className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md hover:border-orange-500/30 hover:bg-white/[0.05] transition-colors group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{typeInfo.icon}</span>
                        <div>
                          <h3 className="text-lg font-bold text-slate-100">
                            {typeInfo.label}
                          </h3>
                          <p className="text-sm text-slate-400 truncate">
                            {item.ingredient_name || 'Unknown Ingredient'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-slate-400">
                          🏢 {item.branch_name || 'Unknown Branch'}
                        </span>
                        {item.location && (
                          <span className="text-slate-400">
                            📍 {item.location}
                          </span>
                        )}
                        {item.reason && (
                          <span className="text-slate-500 text-xs truncate max-w-[200px]">
                            📝 {item.reason}
                          </span>
                        )}
                        <span className="text-slate-500 text-xs">
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
                      <div className="text-xs text-slate-500">
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

      {/* Create Modal - No Edit Mode */}
      {showModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-white/10 shadow-2xl p-6 md:p-8 animate-slideUp max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-2xl z-10"
            >
              ×
            </button>
            
            <h2 className="text-2xl font-bold text-slate-100 mb-6 pr-8">
              New Transaction
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch - Auto-filled with user's branch */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Branch *</label>
                  <select
                    required
                    value={formData.branch}
                    onChange={(e) => setFormData({...formData, branch: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all appearance-none"
                    disabled={!!userBranch}
                  >
                    <option value="" className="text-black">Select a branch</option>
                    {branches.length === 0 ? (
                      <option value="" className="text-black" disabled>No branches available</option>
                    ) : (
                      branches.map((branch) => (
                        <option key={branch.id} value={branch.id} className="text-black">
                          {branch.name} {branch.id === userBranch ? '(Your Branch)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                  {userBranchName && (
                    <p className="text-xs text-blue-400 mt-1">
                      Using your assigned branch: {userBranchName}
                    </p>
                  )}
                </div>
                
                {/* Ingredient */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Ingredient *</label>
                  <select
                    required
                    value={formData.ingredient}
                    onChange={(e) => setFormData({...formData, ingredient: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all appearance-none"
                  >
                    <option value="" className="text-black">Select an ingredient</option>
                    {ingredients.length === 0 ? (
                      <option value="" className="text-black" disabled>
                        {userBranch ? 'No ingredients found for your branch' : 'No ingredients available'}
                      </option>
                    ) : (
                      ingredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id} className="text-black">
                          {ingredient.name} ({ingredient.unit})
                          {ingredient.current_stock && ` - Stock: ${ingredient.current_stock}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Transaction Type */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Transaction Type *</label>
                  <select
                    required
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({...formData, transaction_type: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all appearance-none"
                  >
                    <option value="" className="text-black">Select type</option>
                    {TRANSACTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value} className="text-black">
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Quantity *</label>
                  <input
                    type="number"
                    required
                    step="0.001"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all"
                    placeholder="0.000"
                  />
                  <p className="text-xs text-slate-500 mt-1">Positive = increase, negative = decrease</p>
                </div>

                {/* Unit */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Unit *</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all"
                    placeholder="kg, g, L, etc."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all appearance-none"
                  >
                    <option value="PENDING" className="text-black">⏳ Pending</option>
                    <option value="APPROVED" className="text-black">✅ Approved</option>
                    <option value="REJECTED" className="text-black">❌ Rejected</option>
                  </select>
                </div>

                {/* Location */}
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all"
                    placeholder="Shelf, cooler, storage area..."
                  />
                </div>

                {/* Reason */}
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Reason</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all resize-none"
                    placeholder="Reason for this transaction..."
                  />
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-orange-600 hover:bg-orange-700 transition-all shadow-[0_4px_16px_rgba(234,88,12,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Creating...
                    </span>
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
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm text-slate-300 bg-slate-700/50 hover:bg-slate-700 transition-all"
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