"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Edit2,
  Clock,
  Tag,
  DollarSign,
  Package,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { getMenuItem, deleteMenuItem, MenuItem } from "@/lib/menuApi";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface MenuDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function MenuDetailPage({ params }: MenuDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const data = await getMenuItem(parseInt(id));
        setItem(data);
      } catch (err: any) {
        console.error("Failed to fetch menu item:", err);
        if (err?.detail && err.detail.includes("No Product matches")) {
          setError("The menu item you are looking for does not exist or has been removed.");
        } else {
          setError("Failed to load the menu item. Please try again later.");
        }
        toast.error("Item not found.");
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id, router]);

  const handleDelete = async () => {
    try {
      await deleteMenuItem(parseInt(id));
      toast.success("Menu item deleted successfully.");
      router.push("/dashboard/menu");
    } catch (err: any) {
      toast.error(err?.detail || "Failed to delete menu item.");
    } finally {
      setShowDeleteModal(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading item details...</p>
        </div>
      </div>
    );
  }

  // Not Found / Error state
  if (error || !item) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Item Not Found</h2>
        <p className="text-muted-foreground max-w-md mt-2">
          {error || "The menu item you're looking for doesn't exist."}
        </p>
        <Link href="/dashboard/menu" className="mt-6">
          <Button variant="primary" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Menu
          </Button>
        </Link>
      </motion.div>
    );
  }

  // Success – render item details
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <Link href="/dashboard/menu">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to All Items
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/menu/${item.id}/edit`}>
              <Button variant="primary" size="sm" className="gap-1">
                <Edit2 className="h-4 w-4" /> Edit
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1 bg-red-600 hover:bg-red-700"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        <Card className="max-w-3xl mx-auto bg-muted/30 border-border">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-foreground">{item.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border font-medium",
                    item.is_available
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  )}
                >
                  {item.is_available ? "Available" : "Unavailable"}
                </span>
                {item.category_name && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-background text-muted-foreground border border-border">
                    {item.category_name}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {item.description && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="text-foreground mt-1">{item.description}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-indigo-400" />
                <span className="text-muted-foreground">Price:</span>
                <span className="text-foreground font-semibold">
                  ${parseFloat(item.price).toFixed(2)}
                </span>
              </div>
              {item.cost_price && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="text-foreground">
                    ${parseFloat(item.cost_price).toFixed(2)}
                  </span>
                </div>
              )}
              {item.prep_time_minutes && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Prep Time:</span>
                  <span className="text-foreground">{item.prep_time_minutes} minutes</span>
                </div>
              )}
              {item.product_type && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Type:</span>
                  <span className="text-foreground capitalize">
                    {item.product_type.replace("_", " ")}
                  </span>
                </div>
              )}
            </div>
            {item.price_override && (
              <div className="text-sm text-muted-foreground bg-background p-3 rounded-xl">
                <span className="font-medium">Price Override:</span> $
                {parseFloat(item.price_override).toFixed(2)}
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-2 border-t border-border flex justify-between">
              <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Menu Item"
        icon={<Trash2 className="h-8 w-8 text-red-400" />}
        description={`Are you sure you want to delete "${item.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </>
  );
}