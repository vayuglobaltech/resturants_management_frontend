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
    setError,
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
        cost_price: data.cost_price || "0.00",
        category: parseInt(data.category),
        prep_time_minutes: data.prep_time_minutes,
        is_available: true,
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
    }
    
  //   } catch (error: any) {
    
  //   if (error && typeof error === "object") {
  //     if (error.sku) {  
  //       const skuError = Array.isArray(error.sku) ? error.sku[0] : error.sku;
        
  //       // Set error on the SKU field
  //       setError("sku", {  // ← NEW: Show error below SKU input
  //         type: "manual",
  //         message: skuError
  //       });
        
  //       // Also show toast with a clearer message
  //       if (skuError.includes("already exists")) {
  //         toast.error("This SKU is already in use. Please use a unique SKU.");
  //       } else {
  //         toast.error(skuError);
  //       }
  //     } else {
  //       // Handle other field errors
  //       const messages = Object.entries(error)
  //         .filter(([_, value]) => value !== null && value !== undefined)
  //         .map(([key, value]) => {
  //           if (Array.isArray(value)) {
  //             return `${key}: ${value.join(" ")}`;
  //           }
  //           return `${key}: ${value}`;
  //         });
        
  //       if (messages.length > 0) {
  //         toast.error(messages.join(" | "));
  //       } else {
  //         toast.error("Failed to create menu item.");
  //       }
  //     }
  //   } else {
  //     toast.error("Failed to create menu item.");
  //   }
  // }
  
   finally {
      setLoading(false);
    }
  };


  return (
    <ProtectedWrite>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/menu">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Add Menu Item</h1>
            <p className="text-sm text-muted-foreground">
              Capture the essentials for a new menu offering.
            </p>
          </div>
        </div>

        <Card className="border-border/80 bg-card/80 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">New Menu Item</CardTitle>
            <p className="text-sm text-muted-foreground">
              Keep pricing, category, and prep details consistent.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Name *"
                  placeholder="Enter menu item name"
                  id="name"
                  {...register("name", { required: "Name is required" })}
                  error={errors.name?.message}
                />
                <Input
                  label="SKU *"
                  placeholder="Enter SKU"
                  id="sku"
                  {...register("sku", { required: "SKU is required" })}
                  error={errors.sku?.message}
                />
              </div>

              <Input
                label="Description"
                placeholder="Describe the dish or beverage"
                id="description"
                {...register("description")}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Price *"
                  placeholder="Enter selling price"
                  id="price"
                  type="number"
                  step="0.01"
                  {...register("price", { required: "Price is required" })}
                  error={errors.price?.message}
                />
                <Input
                  label="Cost Price"
                  placeholder="Enter cost price"
                  id="cost_price"
                  type="number"
                  step="0.01"
                  {...register("cost_price")}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="category"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Category *
                  </label>
                  <select
                    id="category"
                    {...register("category", { required: "Category is required" })}
                    className="h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-all focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/15"
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
                    <p className="text-sm text-red-500">{errors.category.message}</p>
                  )}
                </div>
                <Input
                  label="Prep Time (minutes)"
                  id="prep_time_minutes"
                  type="number"
                  {...register("prep_time_minutes")}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  className="min-w-[200px]"
                  disabled={loading || fetchingCategories}
                >
                  {loading ? "Creating..." : "Create Menu Item"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedWrite>
  );
}
