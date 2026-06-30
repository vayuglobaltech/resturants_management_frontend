"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { createRecipe, getProducts } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface Product {
  id: number;
  name: string;
  sku: string;
  product_type: string;
}

export default function AddRecipePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  // Fetch products (only menu items)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts({ product_type: "menu_item" });
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        toast.error("Failed to load products.");
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        product: parseInt(data.product),
        description: data.description || "",
        prep_time_minutes: parseInt(data.prep_time_minutes) || 0,
        yields: parseInt(data.yields) || 1,
        cost_price: parseFloat(data.cost_price) || 0,
        is_active: data.is_active === true,
        notes: data.notes || "",
        branch: user?.branch?.id || 1,
      };
      await createRecipe(payload);
      toast.success("Recipe created successfully!");
      router.push("/dashboard/inventory/recipes");
    } catch (error: any) {
      const msg = error?.detail || error?.message || "Failed to create recipe.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link href="/dashboard/inventory/recipes">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Recipes
        </Button>
      </Link>

      <Card className="bg-white/[0.03] border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-white">Add New Recipe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Product selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Product *
              </label>
              <select
                {...register("product", { required: "Product is required" })}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loadingProducts}
              >
                <option value="">
                  {loadingProducts ? "Loading products..." : "Select a product"}
                </option>
                {!loadingProducts &&
                  products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
              </select>
              {errors.product && (
                <p className="text-sm text-red-400 mt-1">{errors.product.message}</p>
              )}
            </div>

            <Input
              label="Description"
              {...register("description")}
            />

            <Input
              label="Prep Time (minutes)"
              type="number"
              {...register("prep_time_minutes")}
            />

            <Input
              label="Yields"
              type="number"
              {...register("yields")}
            />

            <Input
              label="Cost Price"
              type="number"
              step="0.01"
              {...register("cost_price")}
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                {...register("is_active")}
                className="rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                defaultChecked
              />
              <label htmlFor="is_active" className="text-sm text-slate-300">
                Active
              </label>
            </div>

            <Input
              label="Notes"
              {...register("notes")}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSubmitting ? "Creating..." : "Create Recipe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}