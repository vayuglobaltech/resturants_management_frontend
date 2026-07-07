"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTable } from "@/lib/tableApi";
import { getBranches } from "@/lib/api"; // Import getBranches
import { ArrowLeft, Plus, Users, MapPin, Hash, ChevronRight, Store } from "lucide-react";
import { useCanManage } from "@/hooks/useCanManage";

// In your AddTablePage, update the TABLE_STATUSES to match exactly
// Make sure the values match the choices in your Django model

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
    className={`w-full px-4 py-2 rounded-lg bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${className}`}
    {...props}
  />
);

// Custom Label component
const Label = ({ className = "", children, ...props }: LabelProps) => (
  <label className={`text-sm font-medium text-muted-foreground ${className}`} {...props}>
    {children}
  </label>
);

// Custom Select components
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
        <div className="absolute z-50 w-full mt-1 rounded-lg bg-slate-800 border border-border shadow-lg overflow-hidden max-h-60 overflow-y-auto">
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
    default: "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed",
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
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formData, setFormData] = useState<FormData>({
    table_number: "",
    capacity: "",
    area: "",
    status: "AVAILABLE",
    branch: "",
  });

  // Fetch branches on component mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await getBranches();
        setBranches(data.results || data || []);
        // Set default branch if available
        if (data.results && data.results.length > 0) {
          setFormData(prev => ({ ...prev, branch: String(data.results[0].id) }));
        }
      } catch (err) {
        console.error("Failed to fetch branches:", err);
        setError("Failed to load branches. Please refresh and try again.");
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);
  const canManage = useCanManage();
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate branch is selected
    if (!formData.branch) {
      setError("Please select a branch");
      setLoading(false);
      return;
    }

    try {
      const data = {
        table_number: parseInt(formData.table_number), // Convert to number
        capacity: parseInt(formData.capacity),
        area: formData.area || undefined,
        status: formData.status,
        branch: parseInt(formData.branch), // Branch is required
      };

      console.log("Creating table with data:", data);
      
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
            <Plus className="h-5 w-5 text-indigo-400" />
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
              {/* Branch Selection - Required */}
              <div>
                <Label htmlFor="branch" className="text-muted-foreground">
                  Branch *
                </Label>
                <div className="relative mt-1">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  {loadingBranches ? (
                    <div className="w-full px-4 py-2 rounded-lg bg-muted/30 border border-border text-muted-foreground pl-10">
                      Loading branches...
                    </div>
                  ) : (
                    <Select
                      value={formData.branch}
                      onValueChange={(value) => handleChange("branch", value)}
                      options={branches.map(b => ({ value: b.id, label: b.name }))}
                      placeholder="Select a branch"
                    />
                  )}
                </div>
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
              <Button type="submit" className="flex-1" disabled={loading || loadingBranches || !formData.branch}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
};