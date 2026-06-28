"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { createMenuItem } from "@/lib/menuApi";
import { getCategories } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProtectedWrite } from "@/components/ProtectedWrite";

interface Category {
  id: number;
  name: string;
}

interface FormData {
  name: string;
  sku: string;
  description: string;
  price: string;
  cost_price: string;
  category: string;
  prep_time_minutes: number;
}

export default function AddMenuItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
      price: "",
      cost_price: "",
      category: "",
      prep_time_minutes: 10,
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        toast.error("Failed to load categories.");
      } finally {
        setFetchingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        sku: data.sku,
        description: data.description,
        price: data.price,
        cost_price: data.cost_price || undefined,
        category: parseInt(data.category),
        prep_time_minutes: data.prep_time_minutes,
      };
      await createMenuItem(payload);
      toast.success("Menu item created successfully!");
      router.push("/dashboard/menu");
    } catch (error: any) {
      if (error && typeof error === "object") {
        const messages = Object.values(error).flat().join(" ");
        toast.error(messages || "Failed to create menu item.");
      } else {
        toast.error("Failed to create menu item.");
      }
    } finally {
      setLoading(false);
    }
  };


  return (

    <ProtectedWrite>
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/menu">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Add Menu Item</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>New Menu Item</CardTitle>
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
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Category *
              </label>
              <select
                id="category"
                {...register("category", { required: "Category is required" })}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a category</option>
                {fetchingCategories ? (
                  <option disabled>Loading categories...</option>
                ) : categories.length === 0 ? (
                  <option disabled>No categories available</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
              {errors.category && (
                <p className="text-sm text-red-400 mt-1">
                  {errors.category.message}
                </p>
              )}
            </div>
            <Input
              label="Prep Time (minutes)"
              id="prep_time_minutes"
              type="number"
              {...register("prep_time_minutes")}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loading || fetchingCategories}
            >
              {loading ? "Creating..." : "Create Menu Item"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
    </ProtectedWrite>
  );
}
