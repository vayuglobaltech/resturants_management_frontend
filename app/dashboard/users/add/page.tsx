"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createUser } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import toast from "react-hot-toast";

// ✅ Helper to safely get branch ID
const getBranchId = (user: any): number | null => {
  if (!user) return null;
  
  // Check primary_branch
  if (user.primary_branch && typeof user.primary_branch === 'object' && 'id' in user.primary_branch) {
    return Number((user.primary_branch as any).id);
  }
  
  // Check branch
  if (user.branch && typeof user.branch === 'object' && 'id' in user.branch) {
    return Number((user.branch as any).id);
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
  
  return null;
};

// ✅ Helper to safely get branch name
const getBranchName = (user: any): string => {
  if (!user) return 'No branch assigned';
  
  // Check primary_branch
  if (user.primary_branch && typeof user.primary_branch === 'object' && 'name' in user.primary_branch) {
    return String((user.primary_branch as any).name);
  }
  
  // Check branch
  if (user.branch && typeof user.branch === 'object' && 'name' in user.branch) {
    return String((user.branch as any).name);
  }
  
  // If branch is a string
  if (typeof user.branch === 'string') {
    return user.branch;
  }
  
  return 'Your branch';
};

export default function AddUserPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    role: "",
    is_approved: true,
    is_active: true,
  });

  // ✅ Use the helper to get branch ID safely
  const branchId = getBranchId(user);
  const branchName = getBranchName(user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ Validate branch exists
    if (!branchId) {
      toast.error("No branch assigned to your account. Please contact admin.");
      return;
    }
    
    // ✅ Validate password match
    if (formData.password !== formData.password2) {
      toast.error("Passwords do not match.");
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        role: parseInt(formData.role),
        branch: branchId,
        primary_branch: branchId,
      };
      await createUser(payload);
      toast.success("User created successfully!");
      router.push("/dashboard/users");
    } catch (error: any) {
      const messages = Object.values(error).flat().join(" ");
      toast.error(messages || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/dashboard/users">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Button>
      </Link>

      <Card className="border-border/80 bg-card/80 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-foreground">Add New User</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create a new employee account with the right access and branch assignment.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Username *"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
              <Input
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Password *"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <Input
                label="Confirm Password *"
                type="password"
                value={formData.password2}
                onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                required
              />
              <Input
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <Input
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
              <Input
                label="Phone Number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
                className="h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition-all focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/15"
              >
                <option value="">Select role</option>
                <option value="1">Admin</option>
                <option value="2">Branch Manager</option>
                <option value="3">Cashier</option>
                <option value="4">Waiter</option>
                <option value="5">Kitchen Staff</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Branch (auto-assigned)
              </label>
              <div className="w-full rounded-xl border border-border/70 bg-background/60 px-3.5 py-3 text-sm text-muted-foreground">
                {branchName}
              </div>
            </div>

            <div className="flex flex-wrap gap-6 rounded-xl border border-border/70 bg-background/50 px-3.5 py-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={formData.is_approved}
                  onChange={(e) => setFormData({ ...formData, is_approved: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                Approve immediately
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                Active
              </label>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Link href="/dashboard/users" className="sm:flex-1">
                <Button type="button" variant="ghost" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={submitting} className="flex-1 gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}