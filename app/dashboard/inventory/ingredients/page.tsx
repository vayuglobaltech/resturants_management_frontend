"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  getIngredients, 
  createIngredient, 
  updateIngredient, 
  deleteIngredient,
  getIngredient,
  getBranches,
  apiFetch
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { canManageMenu, getRoleName, hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { X, Loader2, Plus, Search, Edit, Trash2, AlertCircle, CheckCircle, Building, Tag, Package, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/Card";

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
  
  // ─── Branch state ──────────────────────────────────────────────────────────
  const [branchName, setBranchName] = useState("");
  const [validBranchId, setValidBranchId] = useState<number | null>(null);
  const [isBranchValidated, setIsBranchValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  // ─── Fetch user profile and validate branch ──────────────────────────
  useEffect(() => {
    const fetchUserProfileAndValidate = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setBranchesLoading(true);
        
        const res = await apiFetch('/api/users/profile/', {}, true);
        
        let profileBranchName = "";
        let profileBranchId = null;
        
        if (res.ok) {
          const profile = await res.json();
          
          if (profile.branch?.name) {
            profileBranchName = profile.branch.name;
            profileBranchId = profile.branch.id;
          } else if (profile.branch_name) {
            profileBranchName = profile.branch_name;
          } else if (profile.branch?.branch_name) {
            profileBranchName = profile.branch.branch_name;
          }
        }
        
        const branchData = await getBranches();
        const branchList = branchData.results || branchData || [];
        
        if (branchList.length === 0) {
          setError("No branches available in the system");
          setLoading(false);
          setBranchesLoading(false);
          return;
        }
        
        let selectedBranch = null;
        let selectedBranchName = "";
        
        if (profileBranchName) {
          const matchedBranch = branchList.find((b: any) => 
            b.name?.toLowerCase() === profileBranchName.toLowerCase()
          );
          if (matchedBranch) {
            selectedBranch = matchedBranch;
            selectedBranchName = matchedBranch.name;
          } else {
            selectedBranchName = profileBranchName;
            selectedBranch = branchList[0];
          }
        }
        
        if (!selectedBranch) {
          const userBranchId = (user as any)?.branch?.id;
          if (userBranchId) {
            const branchById = branchList.find((b: any) => b.id === userBranchId);
            if (branchById) {
              selectedBranch = branchById;
              selectedBranchName = branchById.name;
            }
          }
        }
        
        if (!selectedBranch) {
          const userBranchName = (user as any)?.branch?.name;
          if (userBranchName) {
            const branchByName = branchList.find((b: any) => 
              b.name?.toLowerCase() === userBranchName.toLowerCase()
            );
            if (branchByName) {
              selectedBranch = branchByName;
              selectedBranchName = branchByName.name;
            }
          }
        }
        
        if (!selectedBranch && branchList.length > 0) {
          selectedBranch = branchList[0];
          selectedBranchName = selectedBranch.name || "Default Branch";
        }
        
        if (selectedBranch) {
          setValidBranchId(selectedBranch.id);
          setBranchName(selectedBranchName);
          setIsBranchValidated(true);
          
          setFormData(prev => ({
            ...prev,
            branch: selectedBranch.id.toString()
          }));
        } else {
          setError("No valid branch found");
          setLoading(false);
          setBranchesLoading(false);
        }
      } catch (error) {
        console.error("Failed to validate branch:", error);
        setError("Failed to load branch data");
        setLoading(false);
        setBranchesLoading(false);
      }
    };

    fetchUserProfileAndValidate();
  }, [user]);

  // ─── Load ingredients after branch is validated ──────────────────────────
  useEffect(() => {
    if (isBranchValidated && validBranchId !== null) {
      loadIngredients();
    }
  }, [isBranchValidated, validBranchId]);

  // ─── Load ingredients ──────────────────────────────────────────────────────
  const loadIngredients = async () => {
    setLoading(true);
    try {
      const ings = await getIngredients();
      setIngredients(ings || []);
    } catch (err: any) {
      console.error('Load error:', err);
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to load ingredients.' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset form ──────────────────────────────────────────────────────────
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
      branch: validBranchId ? validBranchId.toString() : ""
    });
    setEditingId(null);
  };

  // ─── Open modal for create ───────────────────────────────────────────────
  const openCreateModal = () => {
    if (!canManage) {
      setActionMsg({ type: 'error', text: 'You don\'t have permission to create ingredients.' });
      return;
    }
    resetForm();
    setShowModal(true);
  };

  // ─── Open modal for edit ─────────────────────────────────────────────────
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
        branch: ingredient.branch ? ingredient.branch.toString() : (validBranchId ? validBranchId.toString() : "")
      });
      setEditingId(id);
      setShowModal(true);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to load ingredient.' });
    }
  };

  // ─── Handle form submit ──────────────────────────────────────────────────
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

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        cost_per_unit: parseFloat(formData.cost_per_unit),
        minimum_stock: parseFloat(formData.minimum_stock) || 0,
        lead_time_days: parseInt(formData.lead_time_days.toString()) || 2,
        safety_buffer_days: parseInt(formData.safety_buffer_days.toString()) || 1,
        branch: validBranchId
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
      loadIngredients();
    } catch (err: any) {
      console.error('Submit error:', err);
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to save ingredient.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Handle delete ────────────────────────────────────────────────────────
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
      loadIngredients();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to delete ingredient.' });
    }
  };

  // ─── Filter ingredients ──────────────────────────────────────────────────
  const filteredIngredients = ingredients.filter((ing: any) => 
    ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ing.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ing.category && ing.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ─── Show loading while checking auth ──────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin mx-auto" />
          <p className="text-muted-foreground mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // ─── Display branch name ──────────────────────────────────────────────────
  const displayBranchName = branchName || "No branch assigned";

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-[var(--primary)]" />
            Ingredients
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage raw ingredients used in production.
            {userRole && (
              <span className="ml-2 text-xs bg-muted/30 px-2 py-1 rounded-lg border border-border">
                <Shield className="inline h-3 w-3 mr-1" />
                {userRole.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {branchName ? (
              <span className="ml-2 text-xs bg-[var(--primary)]/10 px-2 py-1 rounded-lg border border-[var(--primary)]/20 text-[var(--primary)]">
                <Building className="inline h-3 w-3 mr-1" />
                {branchName}
              </span>
            ) : (
              <span className="ml-2 text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-1 rounded-lg border border-[var(--primary)]/20">
                ⚠️ No branch assigned
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          {canManage && (
            <Button
              onClick={openCreateModal}
              className="bg-[var(--primary)] hover:bg-[color:var(--primary)]/80 shadow-lg shadow-[var(--primary)]/25 gap-2 text-[var(--primary-foreground)]"
            >
              <Plus className="h-4 w-4" />
              Add Ingredient
            </Button>
          )}
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ingredients..."
              className="pl-10 w-full sm:w-64 rounded-xl border-border bg-muted/30 focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
            />
          </div>
        </div>
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
          <button 
            onClick={() => setActionMsg(null)} 
            className="text-xl leading-none opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
        </div>
      ) : (
        /* Ingredients Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIngredients.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/30 border border-border rounded-2xl">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              {searchTerm ? 'No ingredients found matching your search.' : 'No ingredients available. Add your first ingredient!'}
            </div>
          ) : (
            filteredIngredients.map((ing) => {
              const minStock = parseFloat(ing.minimum_stock || '0');
              const hasStockAlert = minStock > 0;
              
              return (
                <Card 
                  key={ing.id} 
                  className="border-border bg-card/50 hover:border-[var(--primary)]/30 transition-all group overflow-hidden"
                >
                  <CardContent className="p-5">
                    <div>
                      {/* Status Badge & Actions */}
                      <div className="flex justify-between items-start mb-3">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                          ing.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                        )}>
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            ing.is_active ? 'bg-emerald-500' : 'bg-red-500'
                          )} />
                          {ing.is_active ? 'Active' : 'Inactive'}
                        </span>
                        
                        {canManage && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEditModal(ing.id)}
                              className="p-1.5 text-muted-foreground hover:text-[var(--primary)] transition-colors rounded-lg hover:bg-muted/50"
                              title="Edit"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            {ing.is_active && (
                              <button 
                                onClick={() => handleDelete(ing.id, ing.name)}
                                className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-muted/50"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Ingredient Info */}
                      <h3 className="text-lg font-bold text-foreground">{ing.name}</h3>
                      <p className="text-muted-foreground text-xs mt-1 font-mono">SKU: {ing.sku}</p>
                      
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] bg-muted/30 rounded-lg text-muted-foreground border border-border">
                          <Package className="h-3 w-3" />
                          {ing.default_unit}
                        </span>
                        {ing.category && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] bg-muted/30 rounded-lg text-muted-foreground border border-border">
                            <Tag className="h-3 w-3" />
                            {ing.category}
                          </span>
                        )}
                        {ing.branch_name && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] bg-muted/30 rounded-lg text-muted-foreground border border-border">
                            <Building className="h-3 w-3" />
                            {ing.branch_name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Stock Info */}
                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Cost / Unit</p>
                        <p className="text-lg font-bold text-[var(--primary)]">
                          Rs. {parseFloat(ing.cost_per_unit || '0').toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Min Stock</p>
                        <p className={cn(
                          "text-sm font-semibold",
                          hasStockAlert ? 'text-[var(--primary)]' : 'text-muted-foreground'
                        )}>
                          {minStock > 0 ? `${minStock} ${ing.default_unit}` : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Lead Time</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ing.lead_time_days || 2} days
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Safety Buffer</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ing.safety_buffer_days || 1} days
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 md:p-8 animate-slideUp max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10 p-1 rounded-lg hover:bg-muted/50"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h2 className="text-xl font-bold text-foreground mb-6 pr-8">
              {editingId ? 'Edit Ingredient' : 'Add New Ingredient'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Chicken Breast"
                    className="rounded-xl focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
                  />
                </div>
                
                {/* SKU */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    SKU <span className="text-red-400">*</span>
                  </label>
                  <Input
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="e.g., CHK-001"
                    className="rounded-xl focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
                  />
                </div>
                
                {/* Category */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="e.g., Meat, Vegetables, Dairy"
                    className="rounded-xl focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
                  />
                </div>
                
                {/* Default Unit */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Default Unit <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.default_unit}
                    onChange={(e) => setFormData({...formData, default_unit: e.target.value})}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
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
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Cost Per Unit (Rs. ) <span className="text-red-400">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({...formData, cost_per_unit: e.target.value})}
                    placeholder="0.00"
                    className="rounded-xl focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
                  />
                </div>
                
                {/* Minimum Stock */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Minimum Stock</label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({...formData, minimum_stock: e.target.value})}
                    placeholder="0"
                    className="rounded-xl focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
                  />
                </div>
                
                {/* Lead Time */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Lead Time (days)</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({...formData, lead_time_days: parseInt(e.target.value) || 0})}
                    placeholder="2"
                    className="rounded-xl focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
                  />
                </div>
                
                {/* Safety Buffer */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Safety Buffer (days)</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.safety_buffer_days}
                    onChange={(e) => setFormData({...formData, safety_buffer_days: parseInt(e.target.value) || 0})}
                    placeholder="1"
                    className="rounded-xl focus:border-[var(--primary)]/50 focus:ring-[var(--primary)]/30"
                  />
                </div>
                
                {/* ─── Branch Field - Auto-filled & Read-only ─── */}
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Branch
                  </label>
                  <div className="relative">
                    <div className={cn(
                      "w-full px-4 py-2.5 border rounded-xl text-foreground cursor-not-allowed bg-muted/30",
                      branchName 
                        ? "border-border" 
                        : "border-[var(--primary)]/30 text-[var(--primary)]"
                    )}>
                      {displayBranchName}
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {branchName ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Auto-assigned
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full border border-[var(--primary)]/20">
                          ⚠️ No branch
                        </span>
                      )}
                    </div>
                  </div>
                  {branchName ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Branch is automatically assigned from your profile
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--primary)] mt-1">
                      ⚠️ No branch assigned to your account. Please contact admin.
                    </p>
                  )}
                  <input
                    type="hidden"
                    value={formData.branch}
                  />
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border sticky bottom-0 bg-card/95 backdrop-blur-sm -mx-6 px-6 py-4 md:-mx-8 md:px-8 rounded-b-2xl">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 sm:flex-none gap-2 bg-[var(--primary)] hover:bg-[color:var(--primary)]/80 shadow-lg shadow-[var(--primary)]/25 text-[var(--primary-foreground)]"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingId ? 'Update Ingredient' : 'Save Ingredient'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 sm:flex-none hover:bg-muted/50"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unauthorized message */}
      {showModal && !canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-card border border-red-500/20 rounded-2xl shadow-2xl p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">You don't have permission to manage ingredients.</p>
            <p className="text-muted-foreground text-sm mb-6">
              Required role: Admin or Branch Manager
            </p>
            <Button
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}