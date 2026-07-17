"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useCanManage } from "@/hooks/useCanManage";
import { getRecipe, updateRecipe, getProducts, getIngredients } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { IngredientManager } from "@/components/inventory/IngredientManager";

interface EditRecipePageProps {
  params: Promise<{ id: string }>;
}

export default function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const canManage = useCanManage();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const recipeId = parseInt(id);
  const isValidId = !isNaN(recipeId) && recipeId > 0;

  useEffect(() => {
    if (!isValidId) {
      toast.error("Invalid recipe ID.");
      router.replace("/dashboard/inventory/recipes");
    }
  }, [isValidId, router]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      product: "",
      description: "",
      prep_time_minutes: "10",
      yields: "1",
      cost_price: "",
      is_active: true,
      ingredients: [{ ingredient: "", quantity: "1", unit: "kg", preparation_note: "" }],
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "ingredients",
  });

  useEffect(() => {
    if (!isValidId) return;
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const [recipeData, productsData, ingredientsData] = await Promise.all([
          getRecipe(recipeId),
          getProducts(),
          getIngredients(),
        ]);

        if (!recipeData) throw new Error("Recipe not found");

        setProducts(Array.isArray(productsData) ? productsData : []);
        setIngredientOptions(Array.isArray(ingredientsData) ? ingredientsData : []);

        reset({
          product: String(recipeData.product),
          description: recipeData.description || "",
          prep_time_minutes: String(recipeData.prep_time_minutes || 10),
          yields: String(recipeData.yields || 1),
          cost_price: recipeData.cost_price || "",
          is_active: recipeData.is_active,
          ingredients: recipeData.ingredients?.length > 0
            ? recipeData.ingredients.map((ing: any) => ({
                ingredient: String(ing.ingredient),
                quantity: String(ing.quantity),
                unit: ing.unit,
                preparation_note: ing.preparation_note || "",
              }))
            : [{ ingredient: "", quantity: "1", unit: "kg", preparation_note: "" }],
        });
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setFetchError("Failed to load recipe data. Please try again.");
        toast.error("Failed to load recipe.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isValidId, recipeId, reset, router]);

  const onSubmit = async (data: any) => {
    if (!isValidId) return;
    setSubmitting(true);
    try {
      const payload = {
        product: parseInt(data.product),
        description: data.description,
        prep_time_minutes: parseInt(data.prep_time_minutes) || 0,
        yields: parseInt(data.yields) || 1,
        cost_price: data.cost_price || "0",
        is_active: data.is_active,
        ingredients: data.ingredients
          .filter((ing: any) => ing.ingredient && ing.quantity)
          .map((ing: any) => ({
            ingredient: parseInt(ing.ingredient),
            quantity: parseFloat(ing.quantity) || 0,
            unit: ing.unit,
            preparation_note: ing.preparation_note || "",
          })),
      };
      await updateRecipe(recipeId, payload);
      toast.success("Recipe updated successfully!");
      router.push(`/dashboard/inventory/recipes/${recipeId}`);
    } catch (error: any) {
      const messages = Object.values(error).flat().join(" ");
      toast.error(messages || "Failed to update recipe.");
    } finally {
      setSubmitting(false);
    }
  };

  const ingredientValue = fields.map((field, index) => ({
    id: index,
    ingredient: parseInt(field.ingredient) || 0,
    quantity: parseFloat(field.quantity) || 0,
    unit: field.unit || "",
    preparation_note: field.preparation_note || "",
  }));

  const handleIngredientChange = (newIngredients: any[]) => {
    replace(
      newIngredients.map((ing) => ({
        ingredient: String(ing.ingredient),
        quantity: String(ing.quantity),
        unit: ing.unit,
        preparation_note: ing.preparation_note || "",
      }))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-sm mt-1">You don't have permission to edit recipes.</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-400" />
        <p className="text-red-400">{fetchError}</p>
        <Link href="/dashboard/inventory/recipes">
          <Button className="mt-4">Back to Recipes</Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-4xl"
    >
      <Link href={`/dashboard/inventory/recipes/${recipeId}`}>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Recipe
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Edit Recipe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Product *</label>
              <select
                {...register("product", { required: "Product is required" })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a product</option>
                {products.length === 0 ? (
                  <option value="" disabled>No products available</option>
                ) : (
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))
                )}
              </select>
              {errors.product && <p className="text-sm text-red-400 mt-1">{errors.product.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Description" id="description" {...register("description")} />
              <Input label="Prep Time (minutes)" id="prep_time_minutes" type="number" {...register("prep_time_minutes")} />
              <Input label="Yields" id="yields" type="number" {...register("yields")} />
              <Input label="Cost Price" id="cost_price" type="number" step="0.01" {...register("cost_price")} />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_active" {...register("is_active")} className="w-4 h-4 accent-indigo-500" />
              <label htmlFor="is_active" className="text-sm text-muted-foreground">Active</label>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Ingredients</h4>
              <IngredientManager
                value={ingredientValue}
                onChange={handleIngredientChange}
                ingredientOptions={ingredientOptions}
                disabled={!canManage}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Link href={`/dashboard/inventory/recipes/${recipeId}`}>
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
              <Button type="submit" disabled={!isDirty || submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}