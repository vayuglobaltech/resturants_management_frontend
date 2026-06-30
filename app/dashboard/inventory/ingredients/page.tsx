"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  getIngredients, 
  createIngredient, 
  updateIngredient, 
  deleteIngredient,
  getIngredient,
  getBranches
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { canManageMenu, getRoleName, hasPermission } from "@/lib/permissions";

type Ingredient = {
  id: number | string;
  name: string;
  sku: string;
  default_unit: string;
  cost_per_unit: string;
  is_active: boolean;
  category: string;
  minimum_stock: string;
  lead_time_days: number;
  safety_buffer_days: number;
  branch: number | null;
  branch_name?: string;
  created_at?: string;
  updated_at?: string;
};

type Branch = {
  id: number;
  name: string;
  location?: string;
};

export default function IngredientsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionMsg, setActionMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    default_unit: "kg",
    cost_per_unit: "",
    category: "",
    minimum_stock: "0",
    lead_time_days: 2,
    safety_buffer_days: 1,
    branch: ""
  });

  // Check user permissions
  const canManage = user ? canManageMenu(user) : false;
  const userRole = user ? getRoleName(user) : null;

  // Load data
  const loadData = async () => {
    setLoading(true);
    setBranchesLoading(true);
    try {
      const [ings, brs] = await Promise.all([
        getIngredients(),
        getBranches().catch((err) => {
          console.error('Branches fetch error:', err);
          return [];
        })
      ]);
      
      setIngredients(ings || []);
      
      let branchesData = brs || [];
      if (brs && brs.results !== undefined) {
        branchesData = brs.results;
      } else if (Array.isArray(brs)) {
        branchesData = brs;
      } else if (brs && typeof brs === 'object') {
        branchesData = Object.values(brs).filter(item => 
          item && typeof item === 'object' && 'id' in item && 'name' in item
        );
      }
      
      setBranches(branchesData);
    } catch (err: any) {
      console.error('Load error:', err);
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to load ingredients.' });
    } finally {
      setLoading(false);
      setBranchesLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    } else if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      default_unit: "kg",
      cost_per_unit: "",
      category: "",
      minimum_stock: "0",
      lead_time_days: 2,
      safety_buffer_days: 1,
      branch: ""
    });
    setEditingId(null);
  };

  // Open modal for create
  const openCreateModal = () => {
    if (!canManage) {
      setActionMsg({ type: 'error', text: 'You don\'t have permission to create ingredients.' });
      return;
    }
    resetForm();
    setShowModal(true);
  };

  // Open modal for edit
  const openEditModal = async (id: number | string) => {
    if (!canManage) {
      setActionMsg({ type: 'error', text: 'You don\'t have permission to edit ingredients.' });
      return;
    }
    
    try {
      const ingredient = await getIngredient(id);
      setFormData({
        name: ingredient.name,
        sku: ingredient.sku,
        default_unit: ingredient.default_unit,
        cost_per_unit: ingredient.cost_per_unit,
        category: ingredient.category || "",
        minimum_stock: ingredient.minimum_stock || "0",
        lead_time_days: ingredient.lead_time_days || 2,
        safety_buffer_days: ingredient.safety_buffer_days || 1,
        branch: ingredient.branch ? ingredient.branch.toString() : ""
      });
      setEditingId(id);
      setShowModal(true);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to load ingredient.' });
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManage) {
      setActionMsg({ type: 'error', text: 'You don\'t have permission to perform this action.' });
      return;
    }
    
    if (!formData.name || !formData.sku || !formData.cost_per_unit) {
      setActionMsg({ type: 'error', text: 'Please fill all required fields (Name, SKU, Cost).' });
      return;
    }

    try {
      const data = {
        ...formData,
        cost_per_unit: parseFloat(formData.cost_per_unit),
        minimum_stock: parseFloat(formData.minimum_stock) || 0,
        lead_time_days: parseInt(formData.lead_time_days.toString()) || 2,
        safety_buffer_days: parseInt(formData.safety_buffer_days.toString()) || 1,
        branch: formData.branch ? parseInt(formData.branch) : null
      };

      if (editingId) {
        await updateIngredient(editingId, data);
        setActionMsg({ type: 'success', text: 'Ingredient updated successfully!' });
      } else {
        await createIngredient(data);
        setActionMsg({ type: 'success', text: 'Ingredient created successfully!' });
      }
      
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      console.error('Submit error:', err);
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to save ingredient.' });
    }
  };

  // Handle delete
  const handleDelete = async (id: number | string, name: string) => {
    if (!canManage) {
      setActionMsg({ type: 'error', text: 'You don\'t have permission to delete ingredients.' });
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${name}"? This will soft delete the ingredient.`)) {
      return;
    }
    
    try {
      await deleteIngredient(id);
      setActionMsg({ type: 'success', text: 'Ingredient deleted successfully!' });
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to delete ingredient.' });
    }
  };

  // Filter ingredients
  const filteredIngredients = ingredients.filter(ing => 
    ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ing.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ing.category && ing.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
    return null; // Will redirect to login
  }

  return (
    <div className="animate-fadeUp">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Ingredients</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Manage raw ingredients used in production.
            {userRole && (
              <span className="ml-2 text-xs bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                Role: {userRole.replace('_', ' ').toUpperCase()}
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
              + Add Ingredient
            </button>
          )}
          
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ingredients..."
              className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-500 text-sm focus:border-orange-500/70 focus:bg-white/[0.06] focus:ring-1 focus:ring-orange-500/70 outline-none transition-all"
            />
          </div>
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
        /* Ingredients Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIngredients.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-500 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              {searchTerm ? 'No ingredients found matching your search.' : 'No ingredients available. Add your first ingredient!'}
            </div>
          ) : (
            filteredIngredients.map((ing) => {
              const minStock = parseFloat(ing.minimum_stock || '0');
              const hasStockAlert = minStock > 0;
              
              return (
                <div 
                  key={ing.id} 
                  className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md flex flex-col hover:border-orange-500/30 hover:bg-white/[0.05] transition-colors group"
                >
                  <div>
                    {/* Status Badge & Actions */}
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg ${
                        ing.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {ing.is_active ? 'Active' : 'Inactive'}
                      </span>
                      
                      {canManage && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditModal(ing.id)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          {ing.is_active && (
                            <button 
                              onClick={() => handleDelete(ing.id, ing.name)}
                              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Ingredient Info */}
                    <h3 className="text-xl font-bold text-slate-100">{ing.name}</h3>
                    <p className="text-slate-400 text-xs mt-1">SKU: {ing.sku}</p>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="px-2 py-1 text-[10px] bg-white/5 rounded-lg text-slate-400 border border-white/5">
                        📦 {ing.default_unit}
                      </span>
                      {ing.category && (
                        <span className="px-2 py-1 text-[10px] bg-white/5 rounded-lg text-slate-400 border border-white/5">
                          🏷️ {ing.category}
                        </span>
                      )}
                      {ing.branch_name && (
                        <span className="px-2 py-1 text-[10px] bg-white/5 rounded-lg text-slate-400 border border-white/5">
                          🏢 {ing.branch_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Stock Info */}
                  <div className="mt-4 pt-4 border-t border-white/[0.05] grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Cost / Unit</p>
                      <p className="text-lg font-bold text-orange-400">
                        ${parseFloat(ing.cost_per_unit || '0').toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Min Stock</p>
                      <p className={`text-sm font-semibold ${hasStockAlert ? 'text-yellow-400' : 'text-slate-300'}`}>
                        {minStock > 0 ? `${minStock} ${ing.default_unit}` : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Lead Time</p>
                      <p className="text-sm text-slate-300">{ing.lead_time_days || 2} days</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Safety Buffer</p>
                      <p className="text-sm text-slate-300">{ing.safety_buffer_days || 1} days</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn ">
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
              {editingId ? 'Edit Ingredient' : 'Add New Ingredient'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Name *</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Chicken Breast"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                
                {/* SKU */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">SKU *</label>
                  <input
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="e.g., CHK-001"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                
                {/* Category */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Category</label>
                  <input
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="e.g., Meat, Vegetables, Dairy"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                
                {/* Default Unit */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Default Unit *</label>
                  <select
                    required
                    value={formData.default_unit}
                    onChange={(e) => setFormData({...formData, default_unit: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 appearance-none transition-all"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="l">Liter (L)</option>
                    <option value="ml">Milliliter (mL)</option>
                    <option value="unit">Unit</option>
                    <option value="lb">Pound (lb)</option>
                    <option value="oz">Ounce (oz)</option>
                  </select>
                </div>
                
                {/* Cost Per Unit */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Cost Per Unit ($) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({...formData, cost_per_unit: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                
                {/* Minimum Stock */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Minimum Stock</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({...formData, minimum_stock: e.target.value})}
                    placeholder="0"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                
                {/* Lead Time */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Lead Time (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({...formData, lead_time_days: parseInt(e.target.value) || 0})}
                    placeholder="2"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                
                {/* Safety Buffer */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Safety Buffer (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.safety_buffer_days}
                    onChange={(e) => setFormData({...formData, safety_buffer_days: parseInt(e.target.value) || 0})}
                    placeholder="1"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                
                {/* Branch */}
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Branch</label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({...formData, branch: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-orange-500/50 appearance-none transition-all"
                    disabled={branchesLoading}
                  >
                    <option value="" className="text-black">
                      {branchesLoading ? 'Loading branches...' : 'No branch (global)'}
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="text-black">
                        {b.name} {b.location ? `(${b.location})` : ''}
                      </option>
                    ))}
                  </select>
                  {branches.length === 0 && !branchesLoading && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ⚠️ No branches available. You can still create ingredients without a branch.
                    </p>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10 sticky bottom-0 bg-slate-900/95 backdrop-blur-sm -mx-6 px-6 py-4 md:-mx-8 md:px-8">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-orange-600 hover:bg-orange-700 transition-all shadow-[0_4px_16px_rgba(234,88,12,0.3)]"
                >
                  {editingId ? 'Update Ingredient' : 'Save Ingredient'}
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

      {/* Unauthorized message */}
      {showModal && !canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-red-500/20 shadow-2xl p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Access Denied</h2>
            <p className="text-slate-400 mb-6">You don't have permission to manage ingredients.</p>
            <p className="text-slate-500 text-sm mb-6">
              Required role: Admin or Branch Manager
            </p>
            <button
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-slate-700 hover:bg-slate-600 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}