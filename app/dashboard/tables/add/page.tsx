"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTable } from "@/lib/tableApi";
import { getBranches, apiFetch } from "@/lib/api";
import { ArrowLeft, Plus, Users, MapPin, Hash, ChevronRight, Store, CheckCircle, Loader2 } from "lucide-react";
import { useCanManage } from "@/hooks/useCanManage";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const TABLE_STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "RESERVED", label: "Reserved" },
  { value: "CLEANING", label: "Cleaning" },
];

// Type definitions
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options?: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  children?: React.ReactNode;
}

interface FormData {
  table_number: string;
  capacity: string;
  area: string;
  status: string;
  branch: string;
}

interface Branch {
  id: number;
  name: string;
  address?: string;
}

// Custom Input component
const Input = ({ className = "", ...props }: InputProps) => (
  <input
    className={`w-full px-4 py-2 rounded-lg bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition ${className}`}
    {...props}
  />
);

// Custom Label component
const Label = ({ className = "", children, ...props }: LabelProps) => (
  <label className={`text-sm font-medium text-muted-foreground ${className}`} {...props}>
    {children}
  </label>
);

// Custom Select components (only for status)
const Select = ({ value, onValueChange, options, placeholder = "Select an option" }: SelectProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  const selectedLabel = options?.find(opt => String(opt.value) === value)?.label || placeholder;
  
  return (
    <div className="relative mt-1">
      <div
        className="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border text-foreground cursor-pointer flex items-center justify-between hover:bg-muted/30 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && options && (
        <div className="absolute z-50 w-full mt-1 rounded-lg bg-background border border-border shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className="px-4 py-2 hover:bg-muted/30 cursor-pointer text-foreground transition"
              onClick={() => {
                onValueChange(String(option.value));
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Custom Card components
const Card = ({ className = "", children }: CardProps) => (
  <div className={`rounded-xl border border-border bg-muted/30 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ className = "", children }: CardProps) => (
  <div className={`px-6 py-4 border-b border-border ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ className = "", children }: CardProps) => (
  <h3 className={`text-lg font-semibold text-foreground ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ className = "", children }: CardProps) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

// Custom Button component
const Button = ({ 
  children, 
  variant = "default", 
  className = "", 
  type = "button",
  disabled = false,
  onClick,
  ...props 
}: ButtonProps) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    default: "bg-[var(--primary)] hover:bg-[color:var(--primary)]/80 text-[var(--primary-foreground)] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--primary)]/25",
    outline: "border border-border hover:bg-muted/30 text-foreground",
    ghost: "hover:bg-muted/30 text-foreground",
  };
  
  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant as keyof typeof variants] || variants.default} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default function AddTablePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userBranchName, setUserBranchName] = useState<string>("");
  const [userBranchId, setUserBranchId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    table_number: "",
    capacity: "",
    area: "",
    status: "AVAILABLE",
    branch: "",
  });

  // Fetch branches and auto-select user's branch
  useEffect(() => {
    const fetchBranchesAndAutoSelect = async () => {
      try {
        setLoadingBranches(true);
        
        // Fetch user profile to get branch
        let branchId = null;
        let branchName = "";
        
        try {
          const res = await apiFetch('/api/users/profile/', {}, true);
          if (res.ok) {
            const profile = await res.json();
            if (profile.branch?.id) {
              branchId = profile.branch.id;
              branchName = profile.branch.name;
            } else if (profile.branch) {
              branchId = profile.branch;
            }
          }
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
        
        if (!branchId && (user as any)?.branch?.id) {
          branchId = (user as any).branch.id;
          branchName = (user as any).branch.name;
        }
        
        const data = await getBranches();
        const branchList = data.results || data || [];
        setBranches(branchList);
        
        let selectedBranchId = null;
        let selectedBranchName = "";
        
        if (branchId) {
          const matchedBranch = branchList.find((b: any) => b.id === branchId);
          if (matchedBranch) {
            selectedBranchId = matchedBranch.id;
            selectedBranchName = matchedBranch.name;
          } else if (branchName) {
            const branchByName = branchList.find((b: any) => 
              b.name?.toLowerCase() === branchName.toLowerCase()
            );
            if (branchByName) {
              selectedBranchId = branchByName.id;
              selectedBranchName = branchByName.name;
            }
          }
        }
        
        if (!selectedBranchId && branchList.length > 0) {
          selectedBranchId = branchList[0].id;
          selectedBranchName = branchList[0].name;
        }
        
        if (selectedBranchId) {
          setUserBranchId(selectedBranchId);
          setUserBranchName(selectedBranchName);
          setFormData(prev => ({ 
            ...prev, 
            branch: String(selectedBranchId) 
          }));
        }
        
      } catch (err) {
        console.error("Failed to fetch branches:", err);
        setError("Failed to load branches. Please refresh and try again.");
      } finally {
        setLoadingBranches(false);
      }
    };
    
    fetchBranchesAndAutoSelect();
  }, [user]);

  const canManage = useCanManage();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.branch) {
      setError("No branch assigned to your account. Please contact admin.");
      setLoading(false);
      return;
    }

    try {
      const data = {
        table_number: parseInt(formData.table_number),
        capacity: parseInt(formData.capacity),
        area: formData.area || undefined,
        status: formData.status,
        branch: parseInt(formData.branch),
      };

      await createTable(data);
      router.push("/dashboard/tables");
      router.refresh();
    } catch (err: unknown) {
      console.error("Error creating table:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to create table";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      {canManage ?
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/tables" className="hover:text-foreground transition-colors">
          Tables
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Add New Table</span>
      </div>

      <Card className="border-border bg-muted/30">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-[var(--primary)]" />
            Create New Table
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Branch - Auto-filled, no dropdown */}
              <div>
                <Label htmlFor="branch" className="text-muted-foreground flex items-center gap-2">
                  Branch *
                  {loadingBranches ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : userBranchName && (
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Auto-assigned
                    </span>
                  )}
                </Label>
                <div className="relative mt-1">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  {loadingBranches ? (
                    <div className="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border text-muted-foreground pl-10">
                      Loading branch...
                    </div>
                  ) : userBranchName ? (
                    <div className="w-full px-4 py-2 rounded-lg bg-muted/30 border border-[var(--primary)]/30 text-foreground pl-10 flex items-center justify-between">
                      <span>{userBranchName}</span>
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-full px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 pl-10">
                      No branch assigned to your account
                    </div>
                  )}
                </div>
               
                <input
                  type="hidden"
                  name="branch"
                  value={formData.branch}
                />
              </div>

              <div>
                <Label htmlFor="table_number" className="text-muted-foreground">
                  Table Number *
                </Label>
                <div className="relative mt-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="table_number"
                    type="number"
                    min="1"
                    value={formData.table_number}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("table_number", e.target.value)}
                    placeholder="e.g., 1, 2, 3"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Table number must be unique per branch</p>
              </div>

              <div>
                <Label htmlFor="capacity" className="text-muted-foreground">
                  Capacity *
                </Label>
                <div className="relative mt-1">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("capacity", e.target.value)}
                    placeholder="Number of persons"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="area" className="text-muted-foreground">
                  Area
                </Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange("area", e.target.value)}
                    placeholder="e.g., Main Hall, Garden, Terrace"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status" className="text-muted-foreground">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                  options={TABLE_STATUSES}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={loading || loadingBranches || !formData.branch}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Table"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
: (
  <div className="flex items-center justify-center min-h-[60vh]">
    <p className="text-muted-foreground text-sm">You do not have permission to manage tables.</p>
  </div>
)}
    </div>
  );
}