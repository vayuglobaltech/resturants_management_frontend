"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCanManage } from "@/hooks/useCanManage";
import { KitchenStationList } from "@/components/kitchen/KitchenStationList";
import { KitchenStationForm } from "@/components/kitchen/KitchenStationForm";
import { CookingPot, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

// ✅ Type guard to check if value is a branch object
function isBranchObject(value: unknown): value is { id: number; name: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'id' in value &&
    'name' in value &&
    typeof (value as any).id === 'number' &&
    typeof (value as any).name === 'string'
  );
}

export default function KitchenStationsPage() {
  const { user } = useAuth();
  const canManage = useCanManage();

  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingStation, setEditingStation] = useState<any>(null);

  const handleSuccess = () => {
    setShowForm(false);
    setEditingStation(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleEdit = (station: any) => {
    setEditingStation(station);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStation(null);
  };

  // ✅ Helper function to safely get user branch ID
  const getUserBranchId = (): number => {
    if (!user) return 1;
    
    // If branch is an object with id and name
    if (user.branch && isBranchObject(user.branch)) {
      return user.branch.id;
    }
    
    // If branch is a number
    if (typeof user.branch === 'number') {
      return user.branch;
    }
    
    // If branch is a string
    if (typeof user.branch === 'string') {
      const parsed = parseInt(user.branch);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    
    // Check primary_branch if it exists
    if (user.primary_branch && isBranchObject(user.primary_branch)) {
      return user.primary_branch.id;
    }
    
    // Fallback to default branch
    return 1;
  };

  const branchId = getUserBranchId();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CookingPot className="h-6 w-6 text-indigo-400" />
            Kitchen Stations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your kitchen stations and their capacities
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => {
              if (showForm) {
                handleCancel();
              } else {
                setShowForm(true);
                setEditingStation(null);
              }
            }}
            className="gap-1.5"
          >
            {showForm ? (
              <>
                <X className="h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add Station
              </>
            )}
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-8">
          <KitchenStationForm
            branchId={branchId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            initialData={editingStation}
          />
        </div>
      )}

      {/* Station List */}
      <KitchenStationList
        onEdit={handleEdit}
        refreshTrigger={refreshKey}
      />
    </div>
  );
}