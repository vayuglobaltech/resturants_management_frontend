"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Clock,
  DollarSign,
  Search,
  Grid3x3,
  List,
  ChevronDown,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useCanManage } from "@/hooks/useCanManage";
import { getRecipes, deleteRecipe } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Recipe {
  id: number;
  product: number;
  product_name: string;
  description: string;
  prep_time_minutes: number;
  yields: number;
  cost_price: string;
  is_active: boolean;
  ingredients: any[];
}

export default function RecipesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const canManage = useCanManage();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getRecipes();
      setRecipes(data);
      setFilteredRecipes(data);
    } catch (error) {
      console.error("Failed to fetch recipes:", error);
      toast.error("Failed to load recipes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Filter & Search ──────────────────────────────────────────────
  useEffect(() => {
    let result = [...recipes];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.product_name?.toLowerCase().includes(term) ||
          r.description?.toLowerCase().includes(term)
      );
    }
    if (showActiveOnly) {
      result = result.filter((r) => r.is_active);
    }
    setFilteredRecipes(result);
  }, [recipes, searchTerm, showActiveOnly]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecipe(deleteTarget.id);
      toast.success("Recipe deleted successfully.");
      fetchData();
    } catch (error: any) {
      toast.error(error?.detail || "Failed to delete recipe.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const formatCurrency = (value: string) =>
    `$${parseFloat(value || "0").toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading recipes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recipes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? "s" : ""}
            {showActiveOnly && " (active)"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <Button
              onClick={() => router.push("/dashboard/inventory/recipes/new")}
              className="gap-1.5 shadow-lg shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4" /> New Recipe
            </Button>
          )}
        </div>
      </div>

      {/* ─── Controls ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-2 border-b border-border/50">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              showActiveOnly
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            <Filter className="inline h-3.5 w-3.5 mr-1.5" />
            Active Only
          </button>
          <div className="flex gap-1 border border-border rounded-lg p-0.5 bg-background">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              aria-label="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Empty State ──────────────────────────────────────────────── */}
      {filteredRecipes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/10"
        >
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-muted/30">
              <Package className="h-12 w-12 text-muted-foreground/50" />
            </div>
          </div>
          <p className="text-muted-foreground mt-4">
            {searchTerm || showActiveOnly
              ? "No recipes match your filters."
              : "No recipes found for your branch."}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {canManage && !searchTerm && !showActiveOnly
              ? "Create your first recipe to get started."
              : "Try adjusting your search or filters."}
          </p>
          {canManage && !searchTerm && !showActiveOnly && (
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard/inventory/recipes/new")}
              className="mt-4 gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create Recipe
            </Button>
          )}
        </motion.div>
      ) : viewMode === "grid" ? (
        // ─── Grid View ────────────────────────────────────────────────
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredRecipes.map((recipe) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className="group relative bg-muted/30 border-border hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 overflow-hidden cursor-pointer"
                  onClick={() => router.push(`/dashboard/inventory/recipes/${recipe.id}`)}
                >
                  <CardContent className="p-4 pb-14">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-foreground font-semibold text-base truncate group-hover:text-indigo-300 transition-colors">
                          {recipe.product_name}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
                          {recipe.description || "No description"}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "shrink-0 text-xs font-medium",
                          recipe.is_active
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        )}
                      >
                        {recipe.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-background px-2.5 py-1 rounded-full">
                        <Package className="h-3 w-3" />
                        {recipe.ingredients?.length || 0} ingredients
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-background px-2.5 py-1 rounded-full">
                        <Clock className="h-3 w-3" />
                        {recipe.prep_time_minutes || 0}m
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-background px-2.5 py-1 rounded-full">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(recipe.cost_price)}
                      </span>
                    </div>
                  </CardContent>

                  {/* ─── Actions ─── */}
                  {canManage && (
                    <div
                      className={cn(
                        "absolute bottom-2 right-3 flex items-center gap-1",
                        "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      )}
                    >
                      <Link
                        href={`/dashboard/inventory/recipes/${recipe.id}/edit`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(recipe);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        // ─── List View ─────────────────────────────────────────────────
        <div className="rounded-xl border border-border overflow-hidden bg-muted/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left">Recipe</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Description</th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">Ingredients</th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">Prep</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Cost</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecipes.map((recipe) => (
                  <tr
                    key={recipe.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/inventory/recipes/${recipe.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {recipe.product_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      <span className="line-clamp-1 max-w-[200px]">
                        {recipe.description || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {recipe.ingredients?.length || 0}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {recipe.prep_time_minutes || 0}m
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell font-medium">
                      {formatCurrency(recipe.cost_price)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        className={cn(
                          "text-xs font-medium",
                          recipe.is_active
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        )}
                      >
                        {recipe.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <>
                            <Link
                              href={`/dashboard/inventory/recipes/${recipe.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </Link>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(recipe);
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex justify-between bg-muted/10">
            <span>Showing {filteredRecipes.length} of {recipes.length} recipes</span>
            <span>
              {recipes.filter((r) => r.is_active).length} active
            </span>
          </div>
        </div>
      )}

      {/* ─── Delete Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Recipe"
        icon={<Trash2 className="h-8 w-8 text-red-400" />}
        description={`Are you sure you want to delete "${deleteTarget?.product_name || 'this recipe'}"? This will soft‑delete the recipe.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </motion.div>
  );
}