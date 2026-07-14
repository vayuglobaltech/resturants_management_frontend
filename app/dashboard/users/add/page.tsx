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

  const branchId = user?.primary_branch?.id || user?.branch?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        role: parseInt(formData.role),
        branch: branchId,          // ✅ auto-set to manager's branch
        primary_branch: branchId,  // ✅ auto-set
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link href="/dashboard/users">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Button>
      </Link>

      <Card className="bg-muted/30 border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-2xl">Add New User</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Create a new employee account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select role</option>
                <option value="1">Admin</option>
                <option value="2">Branch Manager</option>
                <option value="3">Cashier</option>
                <option value="4">Waiter</option>
                <option value="5">Kitchen Staff</option>
              </select>
            </div>

            {/* Branch info (read-only, auto-assigned) */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Branch (auto-assigned)
              </label>
              <div className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground/60">
                {branchId ? user?.branch?.name || user?.primary_branch?.name || "Your branch" : "No branch assigned"}
              </div>
            </div>

            {/* Approval & Active toggles */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={formData.is_approved}
                  onChange={(e) => setFormData({ ...formData, is_approved: e.target.checked })}
                  className="rounded border-border bg-background text-indigo-500 focus:ring-indigo-500"
                />
                Approve immediately
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-border bg-background text-indigo-500 focus:ring-indigo-500"
                />
                Active
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Link href="/dashboard/users" className="flex-1">
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