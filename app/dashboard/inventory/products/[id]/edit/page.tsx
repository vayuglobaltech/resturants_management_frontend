"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getProduct, updateProduct, getCategories } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import toast from "react-hot-toast";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

interface FormData {
  name: string;
  sku: string;
  description: string;
  price: string;
  cost_price: string;
  product_type: string;
  category: string;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      price: "",
      cost_price: "",
      product_type: "menu_item",
      category: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [product, cats] = await Promise.all([
          getProduct(parseInt(id)),
          getCategories(),
        ]);
        setCategories(cats);
        reset({
          name: product.name,
          sku: product.sku,
          description: product.description || "",
          price: product.price,
          cost_price: product.cost_price || "",
          product_type: product.product_type,
          category: String(product.category),
        });
      } catch (error) {
        console.error("Failed to fetch product:", error);
        toast.error("Product not found.");
        router.push("/dashboard/inventory/products");
      } finally {
        setLoading(false);
        setFetchingCategories(false);
      }
    };
    fetchData();
  }, [id, reset, router]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const payload = {
        name: data.name,
        sku: data.sku,
        description: data.description,
        price: data.price,
        cost_price: data.cost_price || undefined,
        product_type: data.product_type,
        category: parseInt(data.category),
      };
      await updateProduct(parseInt(id), payload);
      toast.success("Product updated successfully!");
      router.push(`/dashboard/inventory/products`);
    } catch (error: any) {
      const messages = Object.values(error).flat().join(" ");
      toast.error(messages || "Failed to update product.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || fetchingCategories) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/dashboard/inventory/products">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-white">Edit Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Name *"
              id="name"
              {...register("name", { required: "Name is required" })}
              error={errors.name?.message}
            />
            <Input
              label="SKU *"
              id="sku"
              {...register("sku", { required: "SKU is required" })}
              error={errors.sku?.message}
            />
            <Input
              label="Description"
              id="description"
              {...register("description")}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price *"
                id="price"
                type="number"
                step="0.01"
                {...register("price", { required: "Price is required" })}
                error={errors.price?.message}
              />
              <Input
                label="Cost Price"
                id="cost_price"
                type="number"
                step="0.01"
                {...register("cost_price")}
              />
            </div>
            <div>
              <label htmlFor="product_type" className="block text-sm font-medium text-slate-300 mb-1">
                Product Type *
              </label>
              <select
                id="product_type"
                {...register("product_type", { required: "Product type is required" })}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="menu_item">Menu Item</option>
                <option value="raw_ingredient">Raw Ingredient</option>
                <option value="both">Both</option>
              </select>
              {errors.product_type && <p className="text-sm red-400 mt-1">{errors.product_type.message}</p>}
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-1">
                Category *
              </label>
              <select
                id="category"
                {...register("category", { required: "Category is required" })}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.category && <p className="text-sm red-400 mt-1">{errors.category.message}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={!isDirty || submitting} className="flex-1">
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
              <Link href="/dashboard/inventory/products">
                <Button variant="ghost" type="button">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}