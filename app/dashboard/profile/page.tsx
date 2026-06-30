"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { User, Mail, Phone, Briefcase, Building2, Shield, CheckCircle } from "lucide-react";

type ProfileFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
};

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    setError,
    clearErrors,
  } = useForm<ProfileFormData>({
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
    },
  });

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone_number: user.phone_number || "",
      });
    }
  }, [user, reset]);

  // Manual validation function
  const validateForm = (data: ProfileFormData): boolean => {
    let isValid = true;
    clearErrors();

    // Email validation
    if (!data.email) {
      setError("email", { type: "manual", message: "Email is required" });
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError("email", { type: "manual", message: "Invalid email address" });
      isValid = false;
    }

    // First name optional, but if provided, no validation needed
    // Phone number optional, no validation needed

    return isValid;
  };

  const onSubmit = async (data: ProfileFormData) => {
    // Run manual validation
    if (!validateForm(data)) {
      toast.error("Please fix the errors before saving.");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(data);
      await refreshProfile();
      toast.success("Profile updated successfully!");
      reset(data);
    } catch (error: any) {
      const messages = Object.values(error).flat().join(" ");
      toast.error(messages || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-3xl"
    >
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      <Card className="bg-white/[0.03] border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-400" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                id="first_name"
                {...register("first_name")}
                error={errors.first_name?.message}
              />
              <Input
                label="Last Name"
                id="last_name"
                {...register("last_name")}
                error={errors.last_name?.message}
              />
            </div>
            <Input
              label="Email Address"
              id="email"
              type="email"
              {...register("email")}
              error={errors.email?.message}
            />
            <Input
              label="Phone Number"
              id="phone_number"
              type="tel"
              {...register("phone_number")}
              error={errors.phone_number?.message}
            />
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={!isDirty || isSaving}
                className="gap-2"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              {isDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => reset()}
                  className="text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Read‑only account info */}
      <Card className="bg-white/[0.03] border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-400" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <User className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Username</p>
              <p className="text-sm text-white">{user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <Briefcase className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Role</p>
              <p className="text-sm text-white capitalize">
                {typeof user.role === "object" && "name" in user.role
                  ? user.role.name.replace("_", " ")
                  : "User"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <Building2 className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Branch</p>
              <p className="text-sm text-white">
                {user.branch ? (typeof user.branch === "object" ? user.branch.name : user.branch) : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <CheckCircle className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Email Verified</p>
              <p className="text-sm text-white">
                {user.is_email_verified ? "✅ Verified" : "❌ Not verified"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}