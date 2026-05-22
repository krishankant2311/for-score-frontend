"use client";
import { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/apiBase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const router = useRouter();
  const inFlightRef = useRef(false);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inFlightRef.current || loading) return;

    if (!email || !password) {
      toast.error("Please fill in all fields", { id: "login-form" });
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email", { id: "login-form" });
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    toast.loading("Logging in…", { id: "login" });
    try {
      const res = await axios.post(apiUrl("/api/admin/login"), { email, password });
      if (res?.data?.success) {
        localStorage.setItem("token", res?.data?.result?.token);
        if (keepLoggedIn) {
          // Optional: use a longer-lived storage if you implement it
        }
        toast.success("Login successful!", { id: "login" });
        router.replace("/dashboard");
      } else if (!res?.data?.success && res.data.message === "Password mismatch") {
        toast.error("Password mismatch", { id: "login" });
      } else {
        toast.error(res?.data?.message || "Login failed", { id: "login" });
      }
    } catch (err) {
      const data = err.response?.data;
      const isHtml =
        typeof data === "string" && data.includes("<!DOCTYPE");
      if (isHtml) {
        console.error(
          "Login error: API returned HTML (check backend on",
          apiUrl("/api/admin/login"),
          "and restart admin dev server)"
        );
        toast.error(
          "Cannot reach API server. Start Four_Score backend (port 3000) and restart admin app.",
          { id: "login" }
        );
      } else {
        console.error("Login error:", data || err.message);
        toast.error(data?.message || err.message || "Login failed", { id: "login" });
      }
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  return (
    <>
      <div className="w-full">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Admin access
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Log in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage users, programs, and content.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">
              Email
            </label>
            <Input
              type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              autoComplete="email"
              disabled={loading}
              className="h-11 rounded-xl bg-background"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                disabled={loading}
                className="h-11 rounded-xl bg-background pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">Keep me logged in</span>
            </label>

            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              disabled={loading}
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl">
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>
      </div>

      {/* <div className="mt-6 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          <a href="/term-contions" className="font-medium text-foreground/70 underline-offset-4 hover:text-foreground hover:underline">
            Terms of Use
          </a>
          <span className="mx-2 text-muted-foreground/70">|</span>
          <a href="#" className="font-medium text-foreground/70 underline-offset-4 hover:text-foreground hover:underline">
            Privacy Policy
          </a>
        </p>
      </div> */}
    </>
  );
}
