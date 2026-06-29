"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useCanManage } from "@/hooks/useCanManage";
import { getRecipe, updateRecipe, getProducts, getIngredients } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProtectedWrite } from "@/components/ProtectedWrite";

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
  const [ingredients, setIngredients] = useState<any[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipeData, productsData, ingredientsData] = await Promise.all([
          getRecipe(parseInt(id)),
          getProducts(),
          getIngredients(),
        ]);
        setProducts(productsData);
        setIngredients(ingredientsData);
        reset({
          product: String(recipeData.product),
          description: recipeData.description || "",
          prep_time_minutes: String(recipeData.prep_time_minutes || 10),
          yields: String(recipeData.yields || 1),
          cost_price: recipeData.cost_price || "",
          is_active: recipeData.is_active,
          ingredients: recipeData.ingredients.map((ing: any) => ({
            ingredient: String(ing.ingredient),
            quantity: String(ing.quantity),
            unit: ing.unit,
            preparation_note: ing.preparation_note || "",
          })),
        });
        if (recipeData.ingredients.length === 0) {
          setValue("ingredients", [{ ingredient: "", quantity: "1", unit: "kg", preparation_note: "" }]);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load recipe.");
        router.push("/dashboard/inventory/recipes");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, reset, setValue, router]);

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const payload = {
        product: parseInt(data.product),
        description: data.description,
        prep_time_minutes: parseInt(data.prep_time_minutes) || 0,
        yields: parseInt(data.yields) || 1,
        cost_price: data.cost_price || "0",
        is_active: data.is_active,
        ingredients: data.ingredients.map((ing: any) => ({
          ingredient: parseInt(ing.ingredient),
          quantity: parseFloat(ing.quantity) || 0,
          unit: ing.unit,
          preparation_note: ing.preparation_note || "",
        })),
      };
      await updateRecipe(parseInt(id), payload);
      toast.success("Recipe updated successfully!");
      router.push(`/dashboard/inventory/recipes/${id}`);
    } catch (error: any) {
      const messages = Object.values(error).flat().join(" ");
      toast.error(messages || "Failed to update recipe.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedWrite>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 max-w-4xl"
      >
        <Link href={`/dashboard/inventory/recipes/${id}`}>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Recipe
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-white">Edit Recipe</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Product *</label>
                <select
                  {...register("product", { required: "Product is required" })}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
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
                <label htmlFor="is_active" className="text-sm text-slate-300">Active</label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-slate-300">Ingredients</h4>
                  <button
                    type="button"
                    onClick={() =>
                      append({ ingredient: "", quantity: "1", unit: "kg", preparation_note: "" })
                    }
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    + Add Ingredient
                  </button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-wrap items-end gap-2 bg-white/5 p-3 rounded-xl">
                      <div className="flex-1 min-w-[100px]">
                        <label className="text-xs text-slate-400 block mb-1">Ingredient *</label>
                        <select
                          {...register(`ingredients.${index}.ingredient` as const, { required: true })}
                          className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Select</option>
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.default_unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20">
                        <label className="text-xs text-slate-400 block mb-1">Qty</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(`ingredients.${index}.quantity` as const, { required: true })}
                          className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-white text-sm"
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-slate-400 block mb-1">Unit</label>
                        <input
                          {...register(`ingredients.${index}.unit` as const)}
                          className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-white text-sm"
                          placeholder="kg"
                        />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-xs text-slate-400 block mb-1">Note</label>
                        <input
                          {...register(`ingredients.${index}.preparation_note` as const)}
                          className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-white text-sm"
                          placeholder="e.g., finely chopped"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        disabled={fields.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <Link href={`/dashboard/inventory/recipes/${id}`}>
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
    </ProtectedWrite>
  );
}