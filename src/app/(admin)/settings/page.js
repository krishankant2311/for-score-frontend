"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiOutlineCog } from "react-icons/hi";
import { FaSave } from "react-icons/fa";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";

const TABS = [
  { id: "general", label: "General" },
  // { id: "email", label: "Email" },
  // { id: "notifications", label: "Notifications" },
  { id: "security", label: "Security" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [hasFetchedSettings, setHasFetchedSettings] = useState(false);

  // General Settings
  const [appName, setAppName] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Email Settings
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("noreply@fourscore.com");
  const [fromName, setFromName] = useState("FOUR Score");

  // Notification Settings
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);

  // Security Settings
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [requireLowercase, setRequireLowercase] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [requireSpecialChars, setRequireSpecialChars] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [enforceStrongPasswords, setEnforceStrongPasswords] = useState(true);

  // Admin password change (UI only, no real API)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

      if (!baseUrl) {
        setHasFetchedSettings(true);
        return;
      }
      if (!token) {
        setHasFetchedSettings(true);
        return;
      }

      setIsLoadingSettings(true);
      try {
        const res = await axios.get(`${baseUrl}/api/admin/get-app-settings`, {
          headers: { token },
        });

        const s = res?.data?.result;
        if (!s) return;

        setAppName(s.appName ?? "");
        setAppDescription(s.appDescription ?? "");
        setSupportEmail(s.supportEmail ?? "");
        setContactPhone(s.contactPhone ?? "");

        setTwoFactorEnabled(!!s.security?.twoFactorEnabled);
        setSessionTimeout(Number(s.security?.sessionTimeoutMinutes ?? 60));
        setEnforceStrongPasswords(
          s.security?.enforceStrongPasswords === undefined
            ? true
            : !!s.security.enforceStrongPasswords
        );
      } catch (err) {
        console.error("Load app settings failed:", err?.response?.data || err?.message);
        toast.error(err?.response?.data?.message || "Failed to load app settings");
      } finally {
        setIsLoadingSettings(false);
        setHasFetchedSettings(true);
      }
    };

    load();
  }, []);

  const SkeletonBlock = ({ className }) => (
    <div className={`animate-pulse rounded-lg bg-slate-200 ${className || ""}`} />
  );

  const showLoadingSkeleton = isLoadingSettings && !hasFetchedSettings;

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

    if (!baseUrl) {
      toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
      return;
    }
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setIsSavingSettings(true);
    try {
      const formData = new FormData();
      formData.append("appName", appName);
      formData.append("appDescription", appDescription);
      formData.append("supportEmail", supportEmail);
      formData.append("contactPhone", contactPhone);

      formData.append("twoFactorEnabled", String(twoFactorEnabled));
      formData.append("sessionTimeoutMinutes", String(sessionTimeout));
      formData.append("enforceStrongPasswords", String(enforceStrongPasswords));

      const res = await axios.post(`${baseUrl}/api/admin/save-app-settings`, formData, {
        headers: { token },
      });

      if (res?.data?.success) {
        toast.success(res?.data?.message || "Settings saved successfully!");
      } else {
        toast.error(res?.data?.message || "Failed to save settings");
      }
    } catch (err) {
      console.error("Save app settings failed:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || "Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    if (newPassword.length < minPasswordLength) {
      toast.error(`New password must be at least ${minPasswordLength} characters long`);
      return;
    }

    if (requireUppercase && !/[A-Z]/.test(newPassword)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }
    if (requireLowercase && !/[a-z]/.test(newPassword)) {
      toast.error("Password must contain at least one lowercase letter");
      return;
    }
    if (requireNumbers && !/[0-9]/.test(newPassword)) {
      toast.error("Password must contain at least one number");
      return;
    }
    if (requireSpecialChars && !/[!@#$%^&*(),.?\":{}|<>]/.test(newPassword)) {
      toast.error("Password must contain at least one special character");
      return;
    }

    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

    if (!baseUrl) {
      toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
      return;
    }
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    const tokenPayload = (() => {
      try {
        const base64Url = token.split(".")[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
        return JSON.parse(atob(padded));
      } catch {
        return null;
      }
    })();

    const emailFromToken = tokenPayload?.email;
    if (!emailFromToken) {
      toast.error("Could not read admin email from token. Please login again.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const formData = new FormData();
      formData.append("email", emailFromToken);
      formData.append("oldPassword", currentPassword);
      formData.append("newPassword", newPassword);
      formData.append("confirmPassword", confirmNewPassword);

      const res = await axios.post(`${baseUrl}/api/admin/change-password`, formData, {
        headers: { token },
      });

      if (res?.data?.success) {
        toast.success(res?.data?.message || "Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        toast.error(res?.data?.message || "Failed to update password");
      }
    } catch (err) {
      console.error("Change password failed:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const chipClasses = (active) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-[#0A3161] text-white shadow-sm"
        : "text-[#2158A3] hover:bg-[#F2F5FA]"
    }`;

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <AdminHeaderCard
        title="Settings"
        subtitle="Manage application settings and preferences."
        className="mb-6"
      />

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-[#C8D7E9] bg-white p-1 shadow-sm mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={chipClasses(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-2xl border border-[#C8D7E9] shadow-md p-6 md:p-7">
        {/* General Settings */}
        {activeTab === "general" && showLoadingSkeleton && (
          <div className="space-y-6">
            <SkeletonBlock className="h-5 w-40" />
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-11 w-full" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-24 w-full rounded-xl" />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-11 w-full" />
              </div>
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-11 w-full" />
              </div>
            </div>
          </div>
        )}
        {activeTab === "general" && !showLoadingSkeleton && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold text-[#0A3161] mb-4">General Settings</h2>
            
            <div>
              <label className="text-xs font-medium text-[#2158A3]">
                App Name <span className="text-red-500">*</span>
              </label>
              <Input
                className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                disabled
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#2158A3]">App Description</label>
              <textarea
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-[#C8D7E9] bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30 resize-none"
                value={appDescription}
                onChange={(e) => setAppDescription(e.target.value)}
                disabled
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  Support Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#2158A3]">Contact Phone</label>
                <Input
                  type="tel"
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Email Settings */}
        {activeTab === "email" && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold text-[#0A3161] mb-4">Email Settings</h2>
            
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  SMTP Host <span className="text-red-500">*</span>
                </label>
                <Input
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  SMTP Port <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  SMTP Username <span className="text-red-500">*</span>
                </label>
                <Input
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  SMTP Password <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  From Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  From Name <span className="text-red-500">*</span>
                </label>
                <Input
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold text-[#0A3161] mb-4">Notification Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-[#C8D7E9] bg-white">
                <div>
                  <p className="text-sm font-medium text-[#0A3161]">Push Notifications</p>
                  <p className="text-xs text-[#5671A6] mt-1">Enable push notifications for users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushNotificationsEnabled}
                    onChange={(e) => setPushNotificationsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0A3161]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A3161]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-[#C8D7E9] bg-white">
                <div>
                  <p className="text-sm font-medium text-[#0A3161]">Email Notifications</p>
                  <p className="text-xs text-[#5671A6] mt-1">Send email notifications to users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotificationsEnabled}
                    onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0A3161]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A3161]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-[#C8D7E9] bg-white">
                <div>
                  <p className="text-sm font-medium text-[#0A3161]">SMS Notifications</p>
                  <p className="text-xs text-[#5671A6] mt-1">Send SMS notifications to users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsNotificationsEnabled}
                    onChange={(e) => setSmsNotificationsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0A3161]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A3161]"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === "security" && showLoadingSkeleton && (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-[#C8D7E9] bg-white">
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-44" />
                  <SkeletonBlock className="h-3 w-56" />
                </div>
                <SkeletonBlock className="h-6 w-11 rounded-full" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-[#C8D7E9] bg-white">
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-44" />
                  <SkeletonBlock className="h-3 w-56" />
                </div>
                <SkeletonBlock className="h-6 w-11 rounded-full" />
              </div>
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-44" />
                <SkeletonBlock className="h-11 w-full" />
              </div>
            </div>

            <div className="space-y-4">
              <SkeletonBlock className="h-4 w-44" />
              <SkeletonBlock className="h-3 w-72" />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-11 w-full" />
                </div>
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-11 w-full" />
                </div>
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-36" />
                  <SkeletonBlock className="h-11 w-full" />
                </div>
              </div>
              <div className="flex justify-end mt-10">
                <SkeletonBlock className="h-11 w-44" />
              </div>
            </div>
          </div>
        )}
        {activeTab === "security" && !showLoadingSkeleton && (
          <div className="space-y-8">
            {/* <h2 className="text-sm font-semibold text-[#0A3161] mb-2">Security Settings</h2> */}

            {/* App security (backend) */}
            {/* <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-[#C8D7E9] bg-white">
                <div>
                  <p className="text-sm font-medium text-[#0A3161]">Two-factor authentication</p>
                  <p className="text-xs text-[#5671A6] mt-1">Require 2FA for admin logins</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoFactorEnabled}
                    onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0A3161]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A3161]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-[#C8D7E9] bg-white">
                <div>
                  <p className="text-sm font-medium text-[#0A3161]">Enforce strong passwords</p>
                  <p className="text-xs text-[#5671A6] mt-1">Block weak passwords for admins</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceStrongPasswords}
                    onChange={(e) => setEnforceStrongPasswords(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0A3161]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A3161]"></div>
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  Session Timeout (minutes) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="5"
                  max="1440"
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                />
              </div>
            </div> */}

            {/* Change Admin Password */}
            <div className="">
            {/* <div className="pt-6 border-t border-[#E0E7F5] space-y-4"> */}
              <h3 className="text-sm font-semibold text-[#0A3161]">Change Admin Password</h3>
              <p className="text-xs text-[#5671A6]">
                Update the password for your admin account. Make sure to choose a strong password that
                follows the policy above.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-1">
                  <label className="text-xs font-medium text-[#2158A3]">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#2158A3]">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#2158A3]">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-10">
                <Button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  aria-disabled={isChangingPassword}
                  className="bg-[#0A3161] hover:bg-[#0D3D7A] text-white font-medium px-6 gap-2"
                >
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        {activeTab === "general" && (
          <div className="mt-8 pt-6 border-t border-[#E0E7F5]">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSavingSettings || isLoadingSettings}
              aria-disabled={isSavingSettings || isLoadingSettings}
              className="bg-[#0A3161] hover:bg-[#0D3D7A] text-white font-medium px-6 gap-2"
            >
              <FaSave className="h-4 w-4" />
              {isSavingSettings ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
