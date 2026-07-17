"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface Ingredient {
  id?: number;
  ingredient: number;
  ingredient_name?: string;
  quantity: number;
  unit: string;
  preparation_note?: string;
}

interface IngredientOption {
  id: number;
  name: string;
  default_unit: string;
}

interface IngredientManagerProps {
  value: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
  ingredientOptions: IngredientOption[];
  disabled?: boolean;
  className?: string;
  autoSave?: boolean;
  onSave?: (ingredients: Ingredient[]) => Promise<void>;
}

export function IngredientManager({
  value: ingredients,
  onChange,
  ingredientOptions,
  disabled = false,
  className = "",
  autoSave = false,
  onSave,
}: IngredientManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
    ingredient: 0,
    quantity: 1,
    unit: "",
    preparation_note: "",
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newIngredient.ingredient || !newIngredient.quantity) {
      toast.error("Please select an ingredient and enter a quantity.");
      return;
    }

    const selectedOption = ingredientOptions.find(
      (opt) => opt.id === newIngredient.ingredient
    );

    const newItem: Ingredient = {
      ingredient: newIngredient.ingredient,
      ingredient_name: selectedOption?.name || "Unknown",
      quantity: Number(newIngredient.quantity),
      unit: newIngredient.unit || selectedOption?.default_unit || "kg",
      preparation_note: newIngredient.preparation_note || "",
    };

    const updated = [...ingredients, newItem];
    onChange(updated);

    if (autoSave && onSave) {
      setSaving(true);
      try {
        await onSave(updated);
        toast.success("Ingredient added.");
      } catch (err) {
        onChange(ingredients);
        toast.error("Failed to save ingredient.");
      } finally {
        setSaving(false);
      }
    }

    setIsAdding(false);
    setNewIngredient({ ingredient: 0, quantity: 1, unit: "", preparation_note: "" });
  };

  const handleRemove = async (index: number) => {
    const updated = ingredients.filter((_, i) => i !== index);
    onChange(updated);

    if (autoSave && onSave) {
      setSaving(true);
      try {
        await onSave(updated);
        toast.success("Ingredient removed.");
      } catch (err) {
        onChange(ingredients);
        toast.error("Failed to remove ingredient.");
      } finally {
        setSaving(false);
      }
    }
  };

  const getIngredientName = (id: number) => {
    const opt = ingredientOptions.find((o) => o.id === id);
    return opt?.name || "Unknown";
  };

  return (
    <div className={cn("space-y-3", className)}>
      {ingredients.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
          No ingredients defined.
        </div>
      ) : (
        <div className="space-y-1.5">
          {ingredients.map((ing, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border hover:border-indigo-500/30 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">
                  {ing.ingredient_name || getIngredientName(ing.ingredient)}
                </span>
                {ing.preparation_note && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({ing.preparation_note})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {ing.quantity} {ing.unit}
                </span>
                {!disabled && (
                  <button
                    onClick={() => handleRemove(idx)}
                    className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label="Remove ingredient"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!disabled && (
        <>
          {!isAdding ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mt-2"
            >
              <Plus className="h-4 w-4" /> Add Ingredient
            </button>
          ) : (
            <div className="mt-3 p-3 border border-indigo-500/30 rounded-xl bg-indigo-500/5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">Ingredient *</label>
                  <select
                    value={newIngredient.ingredient || ""}
                    onChange={(e) =>
                      setNewIngredient({
                        ...newIngredient,
                        ingredient: parseInt(e.target.value),
                      })
                    }
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={saving}
                  >
                    <option value="">Select...</option>
                    {ingredientOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} ({opt.default_unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Qty *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newIngredient.quantity || ""}
                    onChange={(e) =>
                      setNewIngredient({ ...newIngredient, quantity: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Unit</label>
                  <input
                    value={newIngredient.unit || ""}
                    onChange={(e) =>
                      setNewIngredient({ ...newIngredient, unit: e.target.value })
                    }
                    placeholder="kg"
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                    disabled={saving}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Preparation Note</label>
                <input
                  value={newIngredient.preparation_note || ""}
                  onChange={(e) =>
                    setNewIngredient({ ...newIngredient, preparation_note: e.target.value })
                  }
                  placeholder="e.g., finely chopped"
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                  disabled={saving}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={saving || !newIngredient.ingredient || !newIngredient.quantity}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" /> Add
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAdding(false);
                    setNewIngredient({ ingredient: 0, quantity: 1, unit: "", preparation_note: "" });
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}