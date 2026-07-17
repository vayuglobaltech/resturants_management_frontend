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

type FormData = {
  product: string;
  description: string;
  prep_time_minutes: string;
  yields: string;
  cost_price: string;
  is_active: boolean;
  notes: string;
};

export default function AddRecipePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  // ✅ Helper function to safely get user branch ID
  const getUserBranchId = (): number => {
    if (!user) return 1;
    
    // If branch is an object with id
    if (user.branch && typeof user.branch === 'object' && 'id' in user.branch) {
      return Number((user.branch as any).id);
    }
    
    // If branch is a number
    if (typeof user.branch === 'number') {
      return user.branch;
    }
    
    // If branch is a string that can be converted to number
    if (typeof user.branch === 'string') {
      const parsed = parseInt(user.branch);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    
    // If primary_branch is an object with id
    if (user.primary_branch && typeof user.primary_branch === 'object' && 'id' in user.primary_branch) {
      return Number((user.primary_branch as any).id);
    }
    
    // Fallback to 1
    return 1;
  };

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

  const onSubmit = async (data: FormData) => {
    try {
      const branchId = getUserBranchId();
      
      const payload = {
        product: parseInt(data.product),
        description: data.description || "",
        prep_time_minutes: parseInt(data.prep_time_minutes) || 0,
        yields: parseInt(data.yields) || 1,
        cost_price: parseFloat(data.cost_price) || 0,
        is_active: data.is_active === true,
        notes: data.notes || "",
        branch: branchId,
      };
      await createRecipe(payload);
      toast.success("Recipe created successfully!");
      router.push("/dashboard/inventory/recipes");
    } catch (error: any) {
      const msg = error?.detail || error?.message || "Failed to create recipe.";
      toast.error(msg);
    }
  };

  // ✅ Helper to safely get error message
  const getErrorMessage = (error: any): string => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error.message) return error.message;
    return 'Invalid input';
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link href="/dashboard/inventory/recipes">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Recipes
        </Button>
      </Link>

      <Card className="bg-muted/30 border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Add New Recipe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Product selection */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Product *
              </label>
              <select
                {...register("product", { required: "Product is required" })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <p className="text-sm text-red-400 mt-1">
                  {getErrorMessage(errors.product.message)}
                </p>
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
                className="rounded border-border bg-background text-indigo-500 focus:ring-indigo-500"
                defaultChecked
              />
              <label htmlFor="is_active" className="text-sm text-muted-foreground">
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