"use client";

import { Suspense, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
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
  const router = useRouter();
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

      const res = await axios.post(apiUrl("/api/user/reset-password"), formData);

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
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Invalid reset link</h1>
        <p className="mb-6 text-sm text-gray-500">
          This password reset link is missing or invalid. Open the latest email from Four Score or
          request a new reset link from the app.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Password updated</h1>
        <p className="mb-6 text-sm text-gray-500">
          Your password has been changed successfully. You can now sign in with your new password in
          the Four Score app.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="w-full rounded-xl bg-[#0A3161] py-3 font-semibold text-white transition hover:bg-[#0A3161]/90"
        >
          Go to login
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Reset your password</h1>
      <p className="mb-6 text-sm text-gray-500">
        Choose a new password for your Four Score account. This link expires in 15 minutes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-gray-900 placeholder-gray-400 transition focus:border-[#1A3B73] focus:outline-none focus:ring-2 focus:ring-[#1A3B73]/30"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            aria-label={showNew ? "Hide new password" : "Show new password"}
          >
            {showNew ? <FiEyeOff size={20} /> : <FiEye size={20} />}
          </button>
        </div>

        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-gray-900 placeholder-gray-400 transition focus:border-[#1A3B73] focus:outline-none focus:ring-2 focus:ring-[#1A3B73]/30"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
          >
            {showConfirm ? <FiEyeOff size={20} /> : <FiEye size={20} />}
          </button>
        </div>

        <p className="text-xs text-gray-500">
          At least 8 characters, including uppercase, lowercase, a number, and a symbol.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#0A3161] py-3 font-semibold text-white transition hover:bg-[#0A3161]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Updating…" : "Update password"}
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
