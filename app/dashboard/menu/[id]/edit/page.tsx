"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getMenuItem, updateMenuItem } from "@/lib/menuApi";
import { getCategories } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { ProtectedWrite } from "@/components/ProtectedWrite";

interface EditMenuItemPageProps {
  params: Promise<{ id: string }>;
}

interface FormData {
  name: string;
  sku: string;
  description: string;
  price: string;
  cost_price: string;
  category: string;
  prep_time_minutes: number;
  is_available: boolean;
}

export default function EditMenuItemPage({ params }: EditMenuItemPageProps) {
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
      category: "",
      prep_time_minutes: 0,
      is_available: true,
    },
  });

  // Fetch categories
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

  // Fetch menu item and populate form
  useEffect(() => {
    const fetchItem = async () => {
      try {
        const data = await getMenuItem(parseInt(id));
        reset({
          name: data.name,
          sku: data.sku || "",
          description: data.description || "",
          price: data.price,
          cost_price: data.cost_price || "",
          category: String(data.category),
          prep_time_minutes: data.prep_time_minutes || 0,
          is_available: data.is_available,
        });
      } catch (error) {
        console.error("Failed to fetch menu item:", error);
        toast.error("Menu item not found.");
        router.push("/dashboard/menu");
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
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
        category: parseInt(data.category),
        prep_time_minutes: data.prep_time_minutes,
        is_available: data.is_available,
      };
      await updateMenuItem(parseInt(id), payload);
      toast.success("Menu item updated successfully!");
      router.push(`/dashboard/menu/${id}`);
    } catch (error: any) {
      if (error && typeof error === "object") {
        const messages = Object.values(error).flat().join(" ");
        toast.error(messages || "Failed to update menu item.");
      } else {
        toast.error("Failed to update menu item.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || fetchingCategories) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <ProtectedWrite>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto flex max-w-3xl flex-col gap-6"
      >
        <Link href={`/dashboard/menu/${id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Item
          </Button>
        </Link>

        <Card className="border-border/80 bg-card/80 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-foreground">Edit Menu Item</CardTitle>
            <p className="text-sm text-muted-foreground">
              Adjust item details while keeping the menu consistent.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
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
              </div>

              <Input
                label="Description"
                id="description"
                {...register("description")}
              />

              <div className="grid gap-4 md:grid-cols-2">
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
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
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

              <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/50 px-3.5 py-3">
                <input
                  type="checkbox"
                  id="is_available"
                  {...register("is_available")}
                  className="h-4 w-4 rounded border-border text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <label htmlFor="is_available" className="text-sm text-muted-foreground">
                  Available for service
                </label>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  type="submit"
                  disabled={!isDirty || submitting}
                  className="flex-1"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
                <Link href={`/dashboard/menu/${id}`} className="sm:flex-1">
                  <Button variant="ghost" type="button" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </ProtectedWrite>
  );
}