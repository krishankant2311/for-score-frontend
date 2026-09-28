"use client";

import { Suspense, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import {
  CheckCircle2,
  Smartphone,
  KeyRound,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { apiUrl } from "@/lib/apiBase";

function isPasswordValid(password) {
  if (!password || password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
  return true;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const securityToken = useMemo(() => {
    const token = searchParams.get("token") || searchParams.get("securityToken") || "";
    return String(token).trim();
  }, [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!securityToken) {
      toast.error("Invalid or missing reset link. Please request a new one from the app.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (!isPasswordValid(newPassword)) {
      toast.error(
        "Password must be at least 8 characters with uppercase, lowercase, a number, and a symbol."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("securityToken", securityToken);
      formData.append("newPassword", newPassword);
      formData.append("confirmPassword", confirmPassword);

      let res;
      try {
        // Try user endpoint first (mobile users are primary)
        res = await axios.post(apiUrl("/api/user/reset-password"), formData);
      } catch (userErr) {
        const msg = userErr?.response?.data?.message || "";
        if (
          userErr?.response?.status === 404 ||
          msg.toLowerCase().includes("invalid reset token")
        ) {
          // If not a regular user, try admin endpoint
          res = await axios.post(apiUrl("/api/admin/reset-password"), formData);
        } else {
          throw userErr;
        }
      }

      if (res?.data?.success) {
        toast.success(res.data.message || "Password reset successfully!");
        setDone(true);
      } else {
        toast.error(res?.data?.message || "Failed to reset password.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (!securityToken) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/60 bg-amber-50 text-amber-600 shadow-sm">
          <AlertCircle className="h-7 w-7 stroke-[2]" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
          Invalid or Expired Link
        </h1>
        <p className="mx-auto mb-2 max-w-sm text-sm leading-relaxed text-gray-500">
          This password reset link is missing or has expired.
        </p>
        <p className="text-xs text-gray-400">
          Please request a new reset link from the Four Score app.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="py-4 text-center">
        {/* Animated / Glowing Badge Icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm ring-8 ring-emerald-50/60">
          <CheckCircle2 className="h-9 w-9 stroke-[2.25]" />
        </div>

        {/* Pill Tag */}
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          All set!
        </span>

        {/* Heading */}
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
          Password Updated
        </h1>

        {/* Description */}
        <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-gray-600">
          Your password has been changed successfully. You can now sign in with your new password.
        </p>

        {/* Informative Helper Card */}
        <div className="mx-auto max-w-sm rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-xs text-gray-500">
          <div className="mb-1 flex items-center justify-center gap-2 font-medium text-gray-800">
            <Smartphone className="h-4 w-4 text-[#0A3161]" />
            <span>Return to App</span>
          </div>
          <p className="leading-relaxed">
            You can safely close this browser window and open the{" "}
            <span className="font-semibold text-gray-700">Four Score</span> app to log in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A3161]/10 text-[#0A3161]">
        <KeyRound className="h-5 w-5 stroke-[2.25]" />
      </div>

      <h1 className="mb-1.5 text-2xl font-bold tracking-tight text-gray-900">
        Reset your password
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Choose a new password for your account. This link expires in 15 minutes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-gray-900 placeholder-gray-400 transition focus:border-[#0A3161] focus:outline-none focus:ring-2 focus:ring-[#0A3161]/20"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              aria-label={showNew ? "Hide new password" : "Show new password"}
            >
              {showNew ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-gray-900 placeholder-gray-400 transition focus:border-[#0A3161] focus:outline-none focus:ring-2 focus:ring-[#0A3161]/20"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0A3161]" />
          <span>
            Must be at least 8 characters with uppercase, lowercase, a number, and a symbol.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#0A3161] py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#0A3161]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Updating password…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-sm text-gray-500">Loading reset form…</div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

