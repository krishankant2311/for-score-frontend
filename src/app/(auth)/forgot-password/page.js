"use client";
import { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { apiUrl } from "@/lib/apiBase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const inFlightRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetEmail = (email || submittedEmail).trim();

    if (inFlightRef.current || loading) return;
    if (!targetEmail) {
      toast.error("Please enter your email!", { id: "forgot" });
      return;
    }

    try {
      inFlightRef.current = true;
      setLoading(true);
      toast.loading("Sending reset link…", { id: "forgot" });

      const res = await axios.post(apiUrl("/api/admin/forgot-password"), {
        email: targetEmail,
      });

      if (res?.data?.success) {
        toast.success(res.data.message || "Reset link sent successfully!", { id: "forgot" });
        setSubmittedEmail(targetEmail);
        setSent(true);
      } else {
        toast.error(res?.data?.message || "Failed to send reset link", { id: "forgot" });
      }
    } catch (error) {
      console.error(
        "Forgot password error:",
        error.response?.data || error.message
      );
      const data = error.response?.data;
      const errorMsg =
        data?.message ||
        data?.error ||
        (typeof data === "string" && data.includes("<!DOCTYPE")
          ? "Cannot connect to server"
          : error.message) ||
        "Something went wrong!";
      toast.error(errorMsg, { id: "forgot" });
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-sm text-gray-600 mb-2">
          We’ve sent a password reset link to:
        </p>
        <p className="text-sm font-semibold text-gray-900 mb-4">{submittedEmail}</p>
        <p className="text-xs text-gray-500 mb-6">
          Click the link in the email to set a new password. The link is valid for 15 minutes.
          If you don’t see it, please check your spam folder.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#0A3161] hover:bg-[#0A3161]/90 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Resending…" : "Resend reset link"}
          </button>

          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail(submittedEmail);
            }}
            className="w-full border border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-medium transition"
          >
            Use a different email
          </button>

          <p className="pt-2 text-center text-sm text-gray-600">
            Remembered your password?{" "}
            <Link
              href="/login"
              className="text-[#1A3B73] hover:text-[#0A3161] hover:underline font-medium"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Forgot Password
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Enter your email address and we’ll send you reset instructions.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoComplete="email"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A3B73]/30 focus:border-[#1A3B73] transition"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0A3161] hover:bg-[#0A3161]/90 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending…" : "Send Reset Link"}
        </button>

        <p className="text-center text-sm text-gray-600">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="text-[#1A3B73] hover:text-[#0A3161] hover:underline font-medium"
          >
            Back to Login
          </Link>
        </p>
      </form>
    </div>
  );
}
