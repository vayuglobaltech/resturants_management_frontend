"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Trash2, Loader2, Package, Clock, DollarSign, Tag, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useCanManage } from "@/hooks/useCanManage";
import { getRecipe, deleteRecipe } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const canManage = useCanManage();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const data = await getRecipe(parseInt(id));
        setRecipe(data);
      } catch (err: any) {
        console.error("Failed to fetch recipe:", err);
        setError("Recipe not found or you don't have permission.");
        toast.error("Recipe not found.");
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [id]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecipe(deleteTarget.id);
      toast.success("Recipe deleted successfully.");
      router.push("/dashboard/inventory/recipes");
    } catch (err: any) {
      toast.error(err?.detail || "Failed to delete recipe.");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <AlertCircle className="h-10 w-10 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-foreground">Recipe Not Found</h2>
        <p className="text-muted-foreground max-w-md mt-2">{error || "The recipe you're looking for doesn't exist."}</p>
        <Link href="/dashboard/inventory/recipes" className="mt-6">
          <Button variant="primary">Back to Recipes</Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/dashboard/inventory/recipes">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Recipes
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <Link href={`/dashboard/inventory/recipes/${recipe.id}/edit`}>
                  <Button variant="primary" size="sm" className="gap-1">
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1 bg-red-600 hover:bg-red-700"
                  onClick={() => setDeleteTarget(recipe)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <Card className="max-w-3xl mx-auto bg-muted/30 border-border">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 text-indigo-400" />
              {recipe.product_name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border font-medium",
                  recipe.is_active
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                )}
              >
                {recipe.is_active ? "Active" : "Inactive"}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-background text-muted-foreground border border-border">
                {recipe.ingredients?.length || 0} ingredients
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recipe.description && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="text-foreground mt-1">{recipe.description}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Prep Time:</span>
                <span className="text-foreground">{recipe.prep_time_minutes || 0} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Yields:</span>
                <span className="text-foreground">{recipe.yields || 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-indigo-400" />
                <span className="text-muted-foreground">Cost:</span>
                <span className="text-foreground">${parseFloat(recipe.cost_price || "0").toFixed(2)}</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Ingredients</h3>
              <div className="space-y-1.5">
                {recipe.ingredients?.length > 0 ? (
                  recipe.ingredients.map((ing: any) => (
                    <div key={ing.id} className="flex justify-between items-center p-2 rounded-lg bg-background border border-border">
                      <div>
                        <span className="text-foreground text-sm">{ing.ingredient_name}</span>
                        {ing.preparation_note && (
                          <span className="text-xs text-muted-foreground ml-2">({ing.preparation_note})</span>
                        )}
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {ing.quantity} {ing.unit}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No ingredients defined.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Recipe"
        icon={<Trash2 className="h-8 w-8 text-red-400" />}
        description={`Are you sure you want to delete "${recipe?.product_name || 'this recipe'}"? This will soft‑delete the recipe.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </>
  );
}