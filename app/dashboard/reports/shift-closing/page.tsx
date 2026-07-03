// app/dashboard/accounting/shift-closing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getShiftClosings,
  createShiftClosing,
  updateShiftClosing,
  approveShiftClosing,
} from "@/lib/accountingApi";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  RefreshCw,
  Eye,
  Check,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ShiftClosingPage() {
  const { user } = useAuth();
  const [shiftClosings, setShiftClosings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [actualCash, setActualCash] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newShift, setNewShift] = useState({
    shift_date: new Date().toISOString().split('T')[0],
    shift_number: 1,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getShiftClosings({ branch: user?.branch?.id });
      setShiftClosings(response.data || []);
    } catch (error) {
      console.error("Failed to fetch shift closings:", error);
      toast.error("Failed to load shift closings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateShift = async () => {
    try {
      await createShiftClosing({
        ...newShift,
        branch: user?.branch?.id,
        cashier: user?.id,
      });
      toast.success("Shift created successfully");
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error("Failed to create shift:", error);
      toast.error("Failed to create shift");
    }
  };

  const handleSubmitShift = async (id: number) => {
    try {
      await updateShiftClosing(id, { status: "SUBMITTED" });
      toast.success("Shift submitted for approval");
      fetchData();
    } catch (error) {
      console.error("Failed to submit shift:", error);
      toast.error("Failed to submit shift");
    }
  };

  const handleApproveShift = async (id: number) => {
    try {
      await approveShiftClosing(id);
      toast.success("Shift approved successfully");
      fetchData();
    } catch (error) {
      console.error("Failed to approve shift:", error);
      toast.error("Failed to approve shift");
    }
  };

  const handleAddActualCash = async (id: number) => {
    if (!actualCash) {
      toast.error("Please enter actual cash amount");
      return;
    }
    try {
      await updateShiftClosing(id, { actual_cash_counted: parseFloat(actualCash) });
      toast.success("Cash count recorded");
      setActualCash("");
      setSelectedShift(null);
      fetchData();
    } catch (error) {
      console.error("Failed to record cash:", error);
      toast.error("Failed to record cash");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      SUBMITTED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return cn("px-2 py-0.5 rounded-full text-xs font-medium border", styles[status as keyof typeof styles] || styles.OPEN);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN": return <Clock className="h-4 w-4" />;
      case "SUBMITTED": return <AlertCircle className="h-4 w-4" />;
      case "APPROVED": return <CheckCircle className="h-4 w-4" />;
      case "REJECTED": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Shift Closing</h1>
          <p className="text-slate-400 text-sm mt-1">
            End-of-shift cash reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Calendar className="h-4 w-4" /> New Shift
          </Button>
        </div>
      </div>

      {shiftClosings.length === 0 ? (
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No shift closings found</p>
            <p className="text-sm text-slate-500 mt-1">Create a new shift closing to start</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {shiftClosings.map((shift) => (
            <Card key={shift.id} className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-white/5">
                      {getStatusIcon(shift.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-white">
                          Shift #{shift.shift_number}
                        </h3>
                        <span className={getStatusBadge(shift.status)}>
                          {shift.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        {new Date(shift.shift_date).toLocaleDateString()} • 
                        {shift.cashier?.username || "Unknown"}
                      </p>
                      {shift.approved_by && (
                        <p className="text-xs text-slate-500">
                          Approved by: {shift.approved_by.username}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Expected Cash</p>
                      <p className="text-sm font-bold text-white">${shift.expected_cash}</p>
                    </div>
                    {shift.actual_cash_counted !== null && (
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Actual Cash</p>
                        <p className="text-sm font-bold text-white">${shift.actual_cash_counted}</p>
                      </div>
                    )}
                    {shift.variance_amount !== 0 && (
                      <div className={cn(
                        "text-right p-2 rounded-lg",
                        shift.variance_amount > 0 ? "bg-emerald-500/10" : "bg-red-500/10"
                      )}>
                        <p className="text-xs text-slate-400">Variance</p>
                        <p className={cn(
                          "text-sm font-bold",
                          shift.variance_amount > 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          {shift.variance_amount > 0 ? "+" : ""}${shift.variance_amount}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    {shift.status === "OPEN" && (
                      <>
                        {shift.actual_cash_counted === null ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedShift(shift.id === selectedShift ? null : shift)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" /> Record Cash
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSubmitShift(shift.id)}
                          >
                            Submit for Approval
                          </Button>
                        )}
                      </>
                    )}
                    {shift.status === "SUBMITTED" && user?.role === "admin" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => handleApproveShift(shift.id)}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    )}
                  </div>
                </div>

                {/* Actual Cash Input */}
                {selectedShift === shift.id && shift.status === "OPEN" && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-slate-400" />
                      <Input
                        type="number"
                        placeholder="Enter actual cash counted..."
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                        className="max-w-[200px]"
                        step="0.01"
                      />
                      <Button onClick={() => handleAddActualCash(shift.id)}>
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedShift(null);
                          setActualCash("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Enter the total cash amount counted from the drawer
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Shift Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">Create New Shift</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">Date</label>
                <Input
                  type="date"
                  value={newShift.shift_date}
                  onChange={(e) => setNewShift({ ...newShift, shift_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Shift Number</label>
                <Input
                  type="number"
                  value={newShift.shift_number}
                  onChange={(e) => setNewShift({ ...newShift, shift_number: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <Button onClick={handleCreateShift} className="flex-1">
                Create Shift
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewShift({
                    shift_date: new Date().toISOString().split('T')[0],
                    shift_number: 1,
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}