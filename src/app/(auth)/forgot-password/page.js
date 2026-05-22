"use client";
import { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Rss } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);
  const router=useRouter()

  const handleSubmit = async (e) => {
  
    e.preventDefault(); // Prevent page reload
    if (inFlightRef.current || loading) return;
    if (!email) {
      toast.error("Please enter your email!", { id: "forgot" });
      return;
    }

    try {
      inFlightRef.current = true;
      setLoading(true);
      toast.loading("Sending OTP…", { id: "forgot" });
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admins/forgot-password`,
        { email }
      );
      // console.log(res);
      if (res?.data?.success) {
        toast.success(res.data.message || "OTP sent successfully!", { id: "forgot" });
        setEmail("");
        sessionStorage.setItem("forgotPasswordEmail", email);
         router.replace("/otp");
      }
      else if(!res?.data?.success){
        if(res?.data?.message=== "Admin not found"){
           toast.error("Your are not a Admin, please check mail ", { id: "forgot" });
        } else {
          toast.error(res?.data?.message || "Failed to send OTP", { id: "forgot" });
        }
      }
    } catch (error) {
      console.error(
        "Forgot password error:",
        error.response?.data || error.message
      );
      toast.error(error.response?.data?.error || "Something went wrong!", { id: "forgot" });
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  return (
    <>
      <div className="">
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
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A3B73]/30 focus:border-[#1A3B73] transition"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0A3161] hover:bg-[#0A3161] text-white py-3 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>

          <p className="text-center text-sm text-gray-600">
            Remembered your password?{" "}
            <a
              href="/login"
              className="text-[#1A3B73] hover:text-[#0A3161] hover:underline font-medium"
            >
              Back to Login
            </a>
          </p>
        </form>
      </div>
    </>
  );
}
