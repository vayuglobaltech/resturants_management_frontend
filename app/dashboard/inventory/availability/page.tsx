"use client";
// components/ProductAvailabilityManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  getProductAvailabilities,
  createProductAvailability,
  getProductAvailability,
  updateProductAvailability,
  deleteProductAvailability,
  getBranches,
  getProducts,
} from '@/lib/api';
import { ProductAvailability, Branch, Product } from '@/types/index';
import { useAuth } from "@/context/AuthContext";
import { canManageMenu, getRoleName } from "@/lib/permissions";

const ProductAvailabilityManagement: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [availabilities, setAvailabilities] = useState<ProductAvailability[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionMsg, setActionMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    branch: "",
    product: "",
    is_available: true,
  });

  // Check user permissions
  const canManage = user ? canManageMenu(user) : false;
  const userRole = user ? getRoleName(user) : null;

  // Fetch branches and products
  const loadBranchesAndProducts = async () => {
    try {
      const [branchesData, productsData] = await Promise.all([
        getBranches(),
        getProducts()
      ]);
      
      // Ensure we have arrays
      const branchesArray = Array.isArray(branchesData) ? branchesData : 
                           branchesData?.results ? branchesData.results : [];
      const productsArray = Array.isArray(productsData) ? productsData : 
                           productsData?.results ? productsData.results : [];
      
      setBranches(branchesArray);
      setProducts(productsArray);
    } catch (error) {
      console.error('Error loading branches/products:', error);
      setActionMsg({ type: 'error', text: 'Failed to load branches or products.' });
      // Set empty arrays on error
      setBranches([]);
      setProducts([]);
    }
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const availabilityData = await getProductAvailabilities();
      // Ensure availability data is an array
      const availabilityArray = Array.isArray(availabilityData) ? availabilityData : 
                               availabilityData?.results ? availabilityData.results : [];
      setAvailabilities(availabilityArray);
      await loadBranchesAndProducts();
    } catch (error: any) {
      setActionMsg({ type: 'error', text: error?.detail || 'Failed to load data' });
      console.error('Error fetching data:', error);
      setAvailabilities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user]);

  // Reset form
  const resetForm = () => {
    setFormData({
      branch: "",
      product: "",
      is_available: true,
    });
    setEditingId(null);
  };

  // Open modal for create
  const openCreateModal = () => {
    if (!canManage) {
      setActionMsg({ type: 'error', text: 'You don\'t have permission to create availability entries.' });
      return;
    }
    resetForm();
    setShowModal(true);
  };

  // Open modal for edit
  const openEditModal = async (record: ProductAvailability) => {
    if (!canManage) {
      setActionMsg({ type: 'error', text: 'You don\'t have permission to edit availability entries.' });
      return;
    }
    
    try {
      const fullRecord = await getProductAvailability(record.id);
      setFormData({
        branch: typeof fullRecord.branch === 'object' ? fullRecord.branch.id.toString() : fullRecord.branch.toString(),
        product: typeof fullRecord.product === 'object' ? fullRecord.product.id.toString() : fullRecord.product.toString(),
        is_available: fullRecord.is_available,
      });
      setEditingId(record.id);
      setShowModal(true);
    } catch (error: any) {
      setActionMsg({ type: 'error', text: error?.detail || 'Failed to load availability entry.' });
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManage) {
      setActionMsg({ type: 'error', text: 'You don\'t have permission to perform this action.' });
      return;
    }
    
    if (!formData.branch || !formData.product) {
      setActionMsg({ type: 'error', text: 'Please select both branch and product.' });
      return;
    }

    setFormLoading(true);
    try {
      const data = {
        branch: parseInt(formData.branch),
        product: parseInt(formData.product),
        is_available: formData.is_available,
      };

      if (editingId) {
        await updateProductAvailability(editingId, data);
        setActionMsg({ type: 'success', text: 'Availability updated successfully!' });
      } else {
        await createProductAvailability(data);
        setActionMsg({ type: 'success', text: 'Availability created successfully!' });
      }
      
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      setActionMsg({ type: 'error', text: error?.detail || 'Failed to save availability.' });
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: number, productName: string, branchName: string) => {
    if (!canManage) {
      setActionMsg({ type: 'error', text: 'You don\'t have permission to delete availability entries.' });
      return;
    }
    
    if (!confirm(`Are you sure you want to delete availability for "${productName}" at "${branchName}"?`)) {
      return;
    }
    
    try {
      await deleteProductAvailability(id);
      setActionMsg({ type: 'success', text: 'Availability deleted successfully!' });
      fetchData();
    } catch (error: any) {
      setActionMsg({ type: 'error', text: error?.detail || 'Failed to delete availability.' });
    }
  };

  // Filter data based on search
  const filteredData = availabilities.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const productName = typeof item.product === 'object' && item.product !== null 
      ? item.product.name 
      : products.find(p => p.id === item.product)?.name || '';
    const branchName = typeof item.branch === 'object' && item.branch !== null 
      ? item.branch.name 
      : branches.find(b => b.id === item.branch)?.name || '';
    return (
      productName.toLowerCase().includes(searchLower) ||
      branchName.toLowerCase().includes(searchLower)
    );
  });

  // Get product and branch names for display
  const getProductName = (product: Product | number) => {
    if (typeof product === 'object' && product !== null) {
      return product.name;
    }
    if (Array.isArray(products)) {
      const found = products.find(p => p.id === product);
      return found?.name || `Product #${product}`;
    }
    return `Product #${product}`;
  };

  const getBranchName = (branch: Branch | number) => {
    if (typeof branch === 'object' && branch !== null) {
      return branch.name;
    }
    if (Array.isArray(branches)) {
      const found = branches.find(b => b.id === branch);
      return found?.name || `Branch #${branch}`;
    }
    return `Branch #${branch}`;
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <span className="w-8 h-8 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin inline-block" />
          <p className="text-muted-foreground mt-4">Loading...</p>
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Product Availability</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage product availability across branches.
            {userRole && (
              <span className="ml-2 text-xs bg-background px-2 py-1 rounded-lg border border-border">
                Role: {userRole.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          {canManage && (
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-foreground bg-orange-600 hover:bg-orange-700 shadow-[0_4px_16px_rgba(234,88,12,0.3)] transition-all"
            >
              + Add Availability
            </button>
          )}
          
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products or branches..."
              className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-orange-500/70 focus:bg-muted/30 focus:ring-1 focus:ring-orange-500/70 outline-none transition-all"
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
        /* Availability Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredData.length === 0 ? (
            <div className="col-span-full py-10 text-center text-muted-foreground bg-muted/30 border border-border rounded-2xl">
              {searchTerm ? 'No availability entries found matching your search.' : 'No availability entries. Add your first entry!'}
            </div>
          ) : (
            filteredData.map((item) => {
              const productName = getProductName(item.product);
              const branchName = getBranchName(item.branch);
              
              return (
                <div 
                  key={item.id} 
                  className="p-5 rounded-2xl border border-border bg-muted/30 backdrop-blur-md flex flex-col hover:border-orange-500/30 hover:bg-muted/30 transition-colors group"
                >
                  <div>
                    {/* Status Badge & Actions */}
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg ${
                        item.is_available
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </span>
                      
                      {canManage && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-muted-foreground hover:text-blue-400 transition-colors rounded-lg hover:bg-background"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id, productName, branchName)}
                            className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded-lg hover:bg-background"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Product & Branch Info */}
                    <h3 className="text-xl font-bold text-foreground">{productName}</h3>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="px-2 py-1 text-[10px] bg-background rounded-lg text-muted-foreground border border-border">
                        🏢 {branchName}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Details */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Status</p>
                      <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        item.is_available
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {item.is_available ? '✅ In Stock' : '❌ Out of Stock'}
                      </div>
                    </div>
                    {item.updated_at && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Updated: {new Date(item.updated_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-border shadow-2xl p-6 md:p-8 animate-slideUp max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors text-2xl z-10"
            >
              ×
            </button>
            
            <h2 className="text-2xl font-bold text-foreground mb-6 pr-8">
              {editingId ? 'Edit Availability' : 'Add New Availability'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5">
                {/* Branch */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Branch *</label>
                  <select
                    required
                    value={formData.branch}
                    onChange={(e) => setFormData({...formData, branch: e.target.value})}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-foreground outline-none focus:border-orange-500/50 focus:bg-muted/30 transition-all appearance-none"
                  >
                    <option value="" className="text-black">Select a branch</option>
                    {Array.isArray(branches) && branches.map((branch) => (
                      <option key={branch.id} value={branch.id} className="text-black">
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Product */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Product *</label>
                  <select
                    required
                    value={formData.product}
                    onChange={(e) => setFormData({...formData, product: e.target.value})}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl text-foreground outline-none focus:border-orange-500/50 focus:bg-muted/30 transition-all appearance-none"
                  >
                    <option value="" className="text-black">Select a product</option>
                    {Array.isArray(products) && products.map((product) => (
                      <option key={product.id} value={product.id} className="text-black">
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Availability Status */}
                <div>
  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
    Availability Status
  </label>

  <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
    <span
      className={`text-sm font-medium transition-colors ${
        formData.is_available ? "text-emerald-400" : "text-muted-foreground"
      }`}
    >
      Available
    </span>

    <button
      type="button"
      onClick={() =>
        setFormData({
          ...formData,
          is_available: !formData.is_available,
        })
      }
      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
        formData.is_available
          ? "bg-emerald-500"
          : "bg-slate-600"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
          formData.is_available
            ? "translate-x-8"
            : "translate-x-1"
        }`}
      />
    </button>

    <span
      className={`text-sm font-medium transition-colors ${
        !formData.is_available ? "text-red-400" : "text-muted-foreground"
      }`}
    >
      Unavailable
    </span>
  </div>
</div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border sticky bottom-0 bg-slate-900/95 backdrop-blur-sm -mx-6 px-6 py-4 md:-mx-8 md:px-8">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm text-foreground bg-orange-600 hover:bg-orange-700 transition-all shadow-[0_4px_16px_rgba(234,88,12,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-border border-t-white animate-spin" />
                      {editingId ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    editingId ? 'Update Availability' : 'Save Availability'
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

      {/* Unauthorized message */}
      {showModal && !canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-red-500/20 shadow-2xl p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">You don't have permission to manage product availability.</p>
            <p className="text-muted-foreground text-sm mb-6">
              Required role: Admin or Branch Manager
            </p>
            <button
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm text-foreground bg-slate-700 hover:bg-slate-600 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAvailabilityManagement;