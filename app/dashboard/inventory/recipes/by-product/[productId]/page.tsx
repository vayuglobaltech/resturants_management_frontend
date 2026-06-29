"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Package, Clock, DollarSign, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { getRecipeByProduct } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface RecipeByProductPageProps {
  params: Promise<{ productId: string }>;
}

export default function RecipeByProductPage({ params }: RecipeByProductPageProps) {
  const { productId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const data = await getRecipeByProduct(parseInt(productId));
        if (!data) {
          setError("No recipe found for this product.");
        } else {
          setRecipe(data);
        }
      } catch (err: any) {
        console.error("Failed to fetch recipe:", err);
        setError("Recipe not found or you don't have permission.");
        toast.error("Recipe not found.");
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [productId]);

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
        <h2 className="text-2xl font-bold text-white">Recipe Not Found</h2>
        <p className="text-slate-400 max-w-md mt-2">{error || "No recipe exists for this product."}</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-3xl mx-auto"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-white gap-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <Card className="bg-white/[0.03] border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-2xl text-white flex items-center gap-2">
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
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-400 border border-white/5">
              {recipe.ingredients?.length || 0} ingredients
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {recipe.description && (
            <div>
              <h3 className="text-sm font-medium text-slate-400">Description</h3>
              <p className="text-slate-200 mt-1">{recipe.description}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400">Prep Time:</span>
              <span className="text-white">{recipe.prep_time_minutes || 0} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400">Yields:</span>
              <span className="text-white">{recipe.yields || 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-indigo-400" />
              <span className="text-slate-400">Cost:</span>
              <span className="text-white">${parseFloat(recipe.cost_price || "0").toFixed(2)}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Ingredients</h3>
            <div className="space-y-1.5">
              {recipe.ingredients?.length > 0 ? (
                recipe.ingredients.map((ing: any) => (
                  <div key={ing.id} className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5">
                    <div>
                      <span className="text-white text-sm">{ing.ingredient_name}</span>
                      {ing.preparation_note && (
                        <span className="text-xs text-slate-400 ml-2">({ing.preparation_note})</span>
                      )}
                    </div>
                    <span className="text-slate-300 text-sm">
                      {ing.quantity} {ing.unit}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-sm">No ingredients defined.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}