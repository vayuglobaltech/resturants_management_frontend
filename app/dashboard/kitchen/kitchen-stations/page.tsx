"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCanManage } from "@/hooks/useCanManage";
import { KitchenStationList } from "@/components/kitchen/KitchenStationList";
import { KitchenStationForm } from "@/components/kitchen/KitchenStationForm";
import { CookingPot, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CookingPot className="h-6 w-6 text-indigo-400" />
            Kitchen Stations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
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
            branchId={user?.branch?.id || 1}
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