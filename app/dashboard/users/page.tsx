"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { listAllUsers, updateUser, createUser, getProfile } from "@/lib/api";
import { useCanManage } from "@/hooks/useCanManage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  Users,
  LayoutGrid,
  List,
  Plus,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type User = {
  id: number;
  username: string;
  email: string;
  role?: { id: number; name: string };
  branch?: { id: number; name: string };
  primary_branch?: { id: number; name: string };
  branch_name?: string;
  primary_branch_name?: string;
  is_approved: boolean;
  is_active: boolean;
  is_email_verified: boolean;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
};

export default function UsersPage() {
  const { user } = useAuth();
  const canManage = useCanManage();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterApproved, setFilterApproved] = useState<"all" | "approved" | "pending">("all");
  const [updating, setUpdating] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");

  // ─── Add User Modal ──────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
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
  const [submitting, setSubmitting] = useState(false);

  // ─── Manager's branch ──────────────────────────────────────────────
  const [managerBranchId, setManagerBranchId] = useState<number | null>(null);
  const [managerBranchName, setManagerBranchName] = useState<string>("");

  useEffect(() => {
    const fetchManagerBranch = async () => {
      try {
        const profile = await getProfile();
        console.log("📦 Full profile response:", profile);

        // Try to extract branch ID from multiple sources
        const branchId =
          profile?.primary_branch?.id ||
          profile?.branch ||
          (user as any)?.primary_branch||
          (user as any)?.branch?.id ||
          null;

        const branchName =
          profile?.primary_branch ||
          profile?.branch ||
          (user as any)?.primary_branch ||
          (user as any)?.branch ||
          "";

        setManagerBranchId(branchId);
        setManagerBranchName(branchName);
        console.log("👤 Manager branch ID:", branchId);
        console.log("👤 Manager branch name:", branchName);
      } catch (error) {
        console.error("Failed to fetch manager profile:", error);
        // Try to get branch from user object as fallback
        const branchId = (user as any)?.primary_branch?.id || (user as any)?.branch?.id || null;
        const branchName = (user as any)?.primary_branch?.name || (user as any)?.branch?.name || "";
        setManagerBranchId(branchId);
        setManagerBranchName(branchName);
      }
    };
    fetchManagerBranch();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const data = await listAllUsers();
      let userList: User[] = [];
      if (Array.isArray(data)) {
        userList = data;
      } else if (data && typeof data === "object") {
        userList = data.results || data.data || [];
      }

      const branchIdFilter = managerBranchId || (user as any)?.primary_branch || (user as any)?.branch;
      let filtered = userList;
      if (branchIdFilter && !["admin"].includes(user?.role?.name || "")) {
        filtered = userList.filter(
          (u: User) =>
            u.branch === branchIdFilter ||
            u.primary_branch === branchIdFilter
        );
      }

      setUsers(filtered);
      setFilteredUsers(filtered);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [managerBranchId]);

  useEffect(() => {
    let result = Array.isArray(users) ? [...users] : [];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.username?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.first_name?.toLowerCase().includes(term) ||
          u.last_name?.toLowerCase().includes(term)
      );
    }
    if (filterApproved === "approved") {
      result = result.filter((u) => u.is_approved);
    } else if (filterApproved === "pending") {
      result = result.filter((u) => !u.is_approved);
    }
    setFilteredUsers(result);
  }, [searchTerm, filterApproved, users]);

  const handleToggleApproval = async (userId: number, currentApproved: boolean) => {
    setUpdating(userId);
    try {
      await updateUser(userId, { is_approved: !currentApproved });
      toast.success(`User ${!currentApproved ? "approved" : "unapproved"} successfully.`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.detail || "Failed to update user.");
    } finally {
      setUpdating(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use managerBranchId from state, fallback to user object
    const branchId = managerBranchId || (user as any)?.primary_branch?.id || (user as any)?.branch?.id;
    if (!branchId) {
      toast.error("Could not determine your branch. Please contact admin.");
      console.error("❌ No branch ID found:", { managerBranchId, user });
      return;
    }

    // Validate required fields
    if (!newUser.username || !newUser.email || !newUser.password || !newUser.password2 || !newUser.role) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (newUser.password !== newUser.password2) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...newUser,
        role: parseInt(newUser.role),
        branch: branchId,
        primary_branch: branchId,
      };
      console.log("📦 Payload:", payload);
      await createUser(payload);
      toast.success("User created successfully!");
      setShowAddModal(false);
      fetchUsers();
      // Reset form
      setNewUser({
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
    } catch (error: any) {
      console.error("❌ Create user error:", error);
      const messages = Object.values(error).flat().join(" ");
      toast.error(messages || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const getUserBranch = (u: User) => u.branch_name || u.primary_branch_name || u.branch?.name || u.primary_branch?.name || "—";

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-indigo-400" /> Employee Management
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddModal(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> Add User
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchUsers}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* ─── Controls ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterApproved}
          onChange={(e) => setFilterApproved(e.target.value as any)}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending Approval</option>
        </select>
        <div className="flex gap-1 border border-white/10 rounded-md p-1 bg-white/5">
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            onClick={() => setViewMode("list")}
            className="gap-1"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === "cards" ? "default" : "ghost"}
            onClick={() => setViewMode("cards")}
            className="gap-1"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ─── View: List ─── */}
      {viewMode === "list" && (
        <Card className="border-white/[0.05] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead className="bg-white/[0.04] text-xs uppercase text-slate-400 font-semibold border-b border-white/[0.08]">
                <tr>
                  <th className="px-6 py-4 text-left">Username</th>
                  <th className="px-6 py-4 text-left">Email</th>
                  <th className="px-6 py-4 text-left">Role</th>
                  <th className="px-6 py-4 text-left">Branch</th>
                  <th className="px-6 py-4 text-center">Approved</th>
                  <th className="px-6 py-4 text-center">Active</th>
                  <th className="px-6 py-4 text-center">Verified</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {!Array.isArray(filteredUsers) || filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        {u.username}
                        {u.first_name && <span className="text-xs text-slate-400 ml-2">({u.first_name})</span>}
                      </td>
                      <td className="px-6 py-4">{u.email}</td>
                      <td className="px-6 py-4 capitalize">{u.role?.name?.replace("_", " ") || "—"}</td>
                      <td className="px-6 py-4">{getUserBranch(u)}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            "inline-block text-xs px-2 py-1 rounded-full border",
                            u.is_approved
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          )}
                        >
                          {u.is_approved ? "✅ Approved" : "⏳ Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            "inline-block text-xs px-2 py-1 rounded-full border",
                            u.is_active
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          )}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            "inline-block text-xs px-2 py-1 rounded-full border",
                            u.is_email_verified
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                          )}
                        >
                          {u.is_email_verified ? "Verified" : "Unverified"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          size="sm"
                          variant={u.is_approved ? "destructive" : "default"}
                          onClick={() => handleToggleApproval(u.id, u.is_approved)}
                          disabled={updating === u.id}
                          className="gap-1 text-xs"
                        >
                          {updating === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : u.is_approved ? (
                            <UserX className="h-3 w-3" />
                          ) : (
                            <UserCheck className="h-3 w-3" />
                          )}
                          {u.is_approved ? "Revoke" : "Approve"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── View: Cards ─── */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!Array.isArray(filteredUsers) || filteredUsers.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-500">No users found.</div>
          ) : (
            filteredUsers.map((u) => (
              <Card key={u.id} className="bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white flex justify-between">
                    <span>{u.username}</span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        u.is_approved
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      )}
                    >
                      {u.is_approved ? "Approved" : "Pending"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-slate-300">
                  <p><span className="text-slate-400">Email:</span> {u.email}</p>
                  <p><span className="text-slate-400">Role:</span> {u.role?.name?.replace("_", " ") || "—"}</p>
                  <p><span className="text-slate-400">Branch:</span> {getUserBranch(u)}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full border",
                      u.is_active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"
                    )}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full border",
                      u.is_email_verified ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    )}>
                      {u.is_email_verified ? "Verified" : "Unverified"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={u.is_approved ? "destructive" : "default"}
                    onClick={() => handleToggleApproval(u.id, u.is_approved)}
                    disabled={updating === u.id}
                    className="w-full mt-2 text-xs gap-1"
                  >
                    {updating === u.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : u.is_approved ? (
                      <UserX className="h-3 w-3" />
                    ) : (
                      <UserCheck className="h-3 w-3" />
                    )}
                    {u.is_approved ? "Revoke" : "Approve"}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ─── Add User Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Confirm Password <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="password"
                    value={newUser.password2}
                    onChange={(e) => setNewUser({ ...newUser, password2: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    First Name
                  </label>
                  <Input
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Last Name
                  </label>
                  <Input
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <Input
                    value={newUser.phone_number}
                    onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Role <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    required
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select role</option>
                    <option value="4">Waiter</option>
                    <option value="3">Cashier</option>
                    <option value="5">Kitchen Staff</option>
                  </select>
                </div>
              </div>

              {/* Branch info (read-only, auto-assigned) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Branch (auto-assigned)
                </label>
                <div className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white/60">
                  {managerBranchName || "Your branch"}
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={newUser.is_approved}
                    onChange={(e) => setNewUser({ ...newUser, is_approved: e.target.checked })}
                    className="rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                  />
                  Approve immediately
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={newUser.is_active}
                    onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                    className="rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                  />
                  Active
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1 gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {submitting ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}