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
  Plus,
  X,
  Check,
  Pencil,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Shield,
  Calendar,
  BadgeCheck,
  Clock,
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
  date_joined?: string;
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

  // ─── Edit User Modal ──────────────────────────────────────────────────
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    role: "",
    is_approved: true,
    is_active: true,
  });
  const [editing, setEditing] = useState(false);

  // ─── Manager's branch ──────────────────────────────────────────────
  const [managerBranchId, setManagerBranchId] = useState<number | null>(null);
  const [managerBranchName, setManagerBranchName] = useState<string>("");

  // ─── Fetch manager branch ──────────────────────────────────────────────
  useEffect(() => {
    const fetchManagerBranch = async () => {
      try {
        const profile = await getProfile();
        const branchId =
          profile?.primary_branch?.id ||
          profile?.branch ||
          (user as any)?.primary_branch ||
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
      } catch (error) {
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
    const branchId = managerBranchId || (user as any)?.primary_branch?.id || (user as any)?.branch?.id;
    if (!branchId) {
      toast.error("Could not determine your branch. Please contact admin.");
      return;
    }
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
      await createUser(payload);
      toast.success("User created successfully!");
      setShowAddModal(false);
      fetchUsers();
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
      const messages = Object.values(error).flat().join(" ");
      toast.error(messages || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Edit User handlers ──────────────────────────────────────────────
  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditFormData({
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      phone_number: u.phone_number || "",
      role: u.role?.id ? String(u.role.id) : "",
      is_approved: u.is_approved,
      is_active: u.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditing(true);
    try {
      await updateUser(editingUser.id, {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        phone_number: editFormData.phone_number,
        role: parseInt(editFormData.role),
        is_approved: editFormData.is_approved,
        is_active: editFormData.is_active,
      });
      toast.success("User updated successfully!");
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      const messages = Object.values(error).flat().join(" ");
      toast.error(messages || "Failed to update user.");
    } finally {
      setEditing(false);
    }
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
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
  const getInitials = (u: User) => {
    const first = u.first_name?.charAt(0) || "";
    const last = u.last_name?.charAt(0) || "";
    return (first + last).toUpperCase() || u.username?.charAt(0).toUpperCase() || "U";
  };

  const getStatusBadge = (u: User) => {
    if (u.is_approved && u.is_active && u.is_email_verified) {
      return { label: "Active", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: BadgeCheck };
    } else if (!u.is_approved) {
      return { label: "Pending", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock };
    } else if (!u.is_active) {
      return { label: "Inactive", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: UserX };
    } else {
      return { label: "Unverified", color: "bg-slate-500/20 text-muted-foreground border-slate-500/30", icon: Mail };
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-400" /> Employee Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredUsers.length} {filteredUsers.length === 1 ? "employee" : "employees"} in {managerBranchName || "your branch"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchUsers} className="gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* ─── Controls ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterApproved}
          onChange={(e) => setFilterApproved(e.target.value as any)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending Approval</option>
        </select>
      </div>

      {/* ─── Employee Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {!Array.isArray(filteredUsers) || filteredUsers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-lg font-medium">No employees found</p>
            <p className="text-sm">Try adjusting your search or filter</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const status = getStatusBadge(u);
            const StatusIcon = status.icon;
            return (
              <Card key={u.id} className="bg-muted/30 border-border hover:border-indigo-500/30 transition-all duration-200 group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                          {getInitials(u)}
                        </div>
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
                          u.is_active && u.is_approved ? "bg-emerald-500" : "bg-red-500"
                        )} />
                      </div>
                      
                      <div>
                        <CardTitle className="text-foreground text-base">
                          {u.first_name && u.last_name 
                            ? `${u.first_name} ${u.last_name}`
                            : u.username}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">@{u.username}</p>
                      </div>
                    </div>
                    
                    <div className={cn(
                      "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border",
                      status.color
                    )}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Contact Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{u.email}</span>
                    </div>
                    {u.phone_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{u.phone_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Role & Branch */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Shield className="h-3.5 w-3.5" />
                        <span>Role</span>
                      </div>
                      <p className="text-sm font-medium capitalize">
                        {u.role?.name?.replace("_", " ") || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>Branch</span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {getUserBranch(u)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(u)}
                      className="flex-1 gap-1 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={u.is_approved ? "destructive" : "default"}
                      onClick={() => handleToggleApproval(u.id, u.is_approved)}
                      disabled={updating === u.id}
                      className="flex-1 gap-1 text-xs"
                    >
                      {updating === u.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : u.is_approved ? (
                        <UserX className="h-3.5 w-3.5" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      {u.is_approved ? "Revoke" : "Approve"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ─── Add User Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Add New Employee</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Username <span className="text-red-400">*</span></label>
                  <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Email <span className="text-red-400">*</span></label>
                  <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Password <span className="text-red-400">*</span></label>
                  <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Confirm Password <span className="text-red-400">*</span></label>
                  <Input type="password" value={newUser.password2} onChange={(e) => setNewUser({ ...newUser, password2: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">First Name</label>
                  <Input value={newUser.first_name} onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Last Name</label>
                  <Input value={newUser.last_name} onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Phone Number</label>
                  <Input value={newUser.phone_number} onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Role <span className="text-red-400">*</span></label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select role</option>
                    <option value="4">Waiter</option>
                    <option value="3">Cashier</option>
                    <option value="5">Kitchen Staff</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Branch (auto-assigned)</label>
                <div className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground/60">
                  {managerBranchName || "Your branch"}
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={newUser.is_approved}
                    onChange={(e) => setNewUser({ ...newUser, is_approved: e.target.checked })}
                    className="rounded border-border bg-background text-indigo-500 focus:ring-indigo-500"
                  />
                  Approve immediately
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={newUser.is_active}
                    onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                    className="rounded border-border bg-background text-indigo-500 focus:ring-indigo-500"
                  />
                  Active
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1 gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {submitting ? "Creating..." : "Create Employee"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit User Modal ─── */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#121826] border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Edit Employee</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Username</label>
                  <div className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground/60">
                    {editingUser.username}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                  <div className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground/60">
                    {editingUser.email}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">First Name</label>
                  <Input
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Last Name</label>
                  <Input
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Phone Number</label>
                <Input
                  value={editFormData.phone_number}
                  onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Role <span className="text-red-400">*</span></label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select role</option>
                  <option value="4">Waiter</option>
                  <option value="3">Cashier</option>
                  <option value="5">Kitchen Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Branch</label>
                <div className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground/60">
                  {getUserBranch(editingUser)}
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={editFormData.is_approved}
                    onChange={(e) => setEditFormData({ ...editFormData, is_approved: e.target.checked })}
                    className="rounded border-border bg-background text-indigo-500 focus:ring-indigo-500"
                  />
                  Approved
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={editFormData.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    className="rounded border-border bg-background text-indigo-500 focus:ring-indigo-500"
                  />
                  Active
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={editing} className="flex-1 gap-2">
                  {editing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editing ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}