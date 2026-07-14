
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { BiBell } from "react-icons/bi";
import { HiOutlineSearch } from "react-icons/hi";
import axios from "axios";
import { sendAdminNotification } from "@/lib/notificationApi";
import { joinAdminPath } from "@/lib/subscriptionPlanApi";

/** Align with admin list / backend (Active, Blocked, …) */
function mapUserRow(u) {
  const id = u?._id ?? u?.id;
  const raw = u?.status;
  const s = String(raw ?? "Active").trim().toLowerCase();
  const status =
    s === "blocked" || s === "inactive" || s === "suspended" || s === "banned"
      ? "Blocked"
      : "Active";
  return {
    id,
    name: u?.name ?? "",
    email: u?.email ?? "",
    goal: u?.fitnessTarget ?? u?.goalDuration ?? "",
    status,
  };
}

export default function NewNotificationPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientMode, setRecipientMode] = useState("active"); // 'active' | 'all' | 'custom'
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState("now"); // now | schedule | draft
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const USERS_PER_PAGE = 8;
  const userSelectionPanelRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem("token");
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

      if (!baseUrl) {
        toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).", { id: "notify-users-baseurl" });
        return;
      }
      if (!token) {
        toast.error("Session expired. Please login again.", { id: "notify-users-token" });
        return;
      }

      setIsFetchingUsers(true);
      try {
        const url = joinAdminPath(baseUrl, "get-all-users");
        const res = await axios.get(url, {
          headers: { token, Authorization: `Bearer ${token}` },
          params: { page: 1, limit: 1000 },
        });
        const raw = res?.data?.result?.users ?? [];
        const mapped = Array.isArray(raw) ? raw.map(mapUserRow) : [];
        setUsers(mapped.filter((u) => u.id != null));
      } catch (err) {
        console.error("Fetch users for notification failed:", err?.response?.data || err?.message);
        toast.error(err?.response?.data?.message || "Failed to load users", { id: "notify-users-fail" });
      } finally {
        setIsFetchingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const activeUsers = users.filter((u) => u.status === "Active");

  const selectedCount =
    recipientMode === "all"
      ? users.length
      : recipientMode === "active"
      ? activeUsers.length
      : selectedUserIds.length;

  const handleToggleUser = (id) => {
    if (recipientMode !== "custom") return;
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (isSending) return;

    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in title and message", { id: "notify-required" });
      return;
    }

    if (deliveryMode === "schedule" && !scheduledAt.trim()) {
      toast.error("Please select a schedule date and time", { id: "notify-schedule-required" });
      return;
    }

    if (deliveryMode === "schedule") {
      const scheduleDate = new Date(scheduledAt);
      if (Number.isNaN(scheduleDate.getTime()) || scheduleDate.getTime() <= Date.now()) {
        toast.error("Schedule time must be in the future", { id: "notify-schedule-future" });
        return;
      }
    }

    if (recipientMode === "custom" && selectedUserIds.length === 0 && deliveryMode !== "draft") {
      toast.error("Please select at least one user for Custom Selection", { id: "notify-custom-required" });
      return;
    }

    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!baseUrl) {
      toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).", { id: "notify-send-baseurl" });
      return;
    }
    if (!token) {
      toast.error("Session expired. Please login again.", { id: "notify-send-token" });
      return;
    }

    let sendToAll = false;
    let userIds;
    if (recipientMode === "all") {
      sendToAll = true;
    } else if (recipientMode === "active") {
      userIds = activeUsers.map((u) => String(u.id));
      if (!userIds.length && deliveryMode !== "draft") {
        toast.error("No active users to notify.", { id: "notify-no-active" });
        return;
      }
    } else {
      userIds = [...selectedUserIds].map((id) => String(id));
    }

    setIsSending(true);
    try {
      const scheduleIso =
        deliveryMode === "schedule" && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : undefined;

      await sendAdminNotification({
        token,
        baseUrl,
        title: title.trim(),
        message: message.trim(),
        sendToAll,
        userIds,
        deliveryMode,
        scheduledAt: scheduleIso,
        recipientMode,
        type: "General",
      });
      const successMsg =
        deliveryMode === "draft"
          ? "Notification saved as draft!"
          : deliveryMode === "schedule"
            ? "Notification scheduled successfully!"
            : "Notification sent successfully!";
      toast.success(successMsg, { id: "notify-sent" });
      router.push("/notification");
    } catch (err) {
      console.error("Send notification failed:", err?.adminPayload || err?.message);
      toast.error(
        err?.adminPayload?.error ||
          err?.adminPayload?.message ||
          err?.message ||
          "Failed to send notification.",
        { id: "notify-send-fail", duration: 8000 }
      );
    } finally {
      setIsSending(false);
    }
  };

  const deliveryPillClasses = (active) =>
    `flex-1 rounded-full border text-xs sm:text-sm font-medium py-2.5 px-3 text-center transition-all ${
      active
        ? "bg-[#0A3161] text-white border-[#0A3161] shadow-sm"
        : "bg-white text-[#2158A3] border-[#C8D7E9] hover:bg-[#F2F5FA]"
    }`;

  const submitLabel =
    deliveryMode === "draft"
      ? "Save Draft"
      : deliveryMode === "schedule"
        ? "Schedule Notification"
        : "Send Notification";

  const minScheduleValue = useMemo(() => {
    const d = new Date(Date.now() + 60_000);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  const pillClasses = (active) =>
    `flex-1 rounded-full border text-xs sm:text-sm font-medium py-2.5 px-4 text-center transition-all ${
      active
        ? "bg-[#0A3161] text-white border-[#0A3161] shadow-sm"
        : "bg-white text-[#2158A3] border-[#C8D7E9] hover:bg-[#F2F5FA]"
    }`;

  const helperText =
    recipientMode === "active"
      ? "All active users are automatically selected."
      : recipientMode === "all"
      ? "All users in the app will receive this notification."
      : "Select specific users from the list on the right.";

  const baseVisibleUsers =
    recipientMode === "active"
      ? activeUsers
      : users;

  const visibleUsers = useMemo(() => {
    if (!userSearchTerm.trim()) return baseVisibleUsers;
    const searchLower = userSearchTerm.toLowerCase();
    return baseVisibleUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
    );
  }, [baseVisibleUsers, userSearchTerm]);

  const totalUserPages = Math.max(1, Math.ceil(visibleUsers.length / USERS_PER_PAGE));
  const paginatedVisibleUsers = useMemo(() => {
    const start = (userPage - 1) * USERS_PER_PAGE;
    return visibleUsers.slice(start, start + USERS_PER_PAGE);
  }, [visibleUsers, userPage]);

  // Keep page in range when filters/search/mode changes.
  useEffect(() => {
    setUserPage((p) => Math.max(1, Math.min(p, totalUserPages)));
  }, [totalUserPages]);

  useEffect(() => {
    // Reset to first page when search or mode changes for better UX.
    setUserPage(1);
  }, [userSearchTerm, recipientMode]);

  const goToUserPage = (nextPage) => {
    const clamped = Math.max(1, Math.min(nextPage, totalUserPages));
    setUserPage(clamped);
    requestAnimationFrame(() => {
      userSelectionPanelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };

  return (
    <div className="min-h-[80vh] py-8 px-1">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#C8D7E9] bg-white text-[#0A3161] hover:bg-[#F2F5FA] transition-colors"
          aria-label="Back"
        >
          <HiOutlineArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A3161] text-white shadow-md">
            <BiBell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A3161] leading-6">
              Send Notification
            </h1>
            <p className="text-sm text-[#2158A3]">Send notifications to app users</p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Left: Notification details */}
        <div className="bg-white rounded-2xl border border-[#C8D7E9] shadow-md p-6 md:p-7 space-y-6">
          {/* Notification details */}
          <div>
            <h2 className="text-sm font-semibold text-[#0A3161] mb-3">Notification Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  Notification Title <span className="text-red-500">*</span>
                </label>
                <Input
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                  placeholder="Enter notification title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#2158A3]">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  className="mt-1.5 w-full rounded-xl border border-[#C8D7E9] bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30 resize-none"
                  placeholder="Enter your notification message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div className="pt-4 border-t border-[#E0E7F5]">
            <h2 className="text-sm font-semibold text-[#0A3161] mb-3">Select Recipients</h2>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                className={pillClasses(recipientMode === "active")}
                onClick={() => setRecipientMode("active")}
              >
                Active Users Only ({activeUsers.length} users)
              </button>
              <button
                type="button"
                className={pillClasses(recipientMode === "all")}
                onClick={() => setRecipientMode("all")}
              >
                All Users ({users.length})
              </button>
              <button
                type="button"
                className={pillClasses(recipientMode === "custom")}
                onClick={() => setRecipientMode("custom")}
              >
                Custom Selection
              </button>
            </div>

            <p className="mt-3 text-xs text-[#5671A6] bg-[#F5F7FB] rounded-lg px-3 py-2">
              {helperText}
            </p>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-[#C8D7E9] bg-[#F5F7FB] px-3 py-2 text-xs sm:text-sm text-[#0A3161]">
              <span className="font-medium">Selected Users</span>
              <span className="font-semibold">{selectedCount} users</span>
            </div>
          </div>

          {/* Delivery mode */}
          <div className="pt-4 border-t border-[#E0E7F5]">
            <h2 className="text-sm font-semibold text-[#0A3161] mb-3">Delivery</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                className={deliveryPillClasses(deliveryMode === "now")}
                onClick={() => setDeliveryMode("now")}
              >
                Send Now
              </button>
              <button
                type="button"
                className={deliveryPillClasses(deliveryMode === "schedule")}
                onClick={() => setDeliveryMode("schedule")}
              >
                Schedule
              </button>
              <button
                type="button"
                className={deliveryPillClasses(deliveryMode === "draft")}
                onClick={() => setDeliveryMode("draft")}
              >
                Save Draft
              </button>
            </div>
            {deliveryMode === "schedule" ? (
              <div className="mt-4">
                <label className="text-xs font-medium text-[#2158A3]">
                  Schedule date & time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                  value={scheduledAt}
                  min={minScheduleValue}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="mt-2 text-xs text-[#5671A6]">
                  Notification will be sent automatically at the selected time.
                </p>
              </div>
            ) : deliveryMode === "draft" ? (
              <p className="mt-3 text-xs text-[#5671A6] bg-[#F5F7FB] rounded-lg px-3 py-2">
                Save without sending. You can review drafts from the Notifications list.
              </p>
            ) : (
              <p className="mt-3 text-xs text-[#5671A6] bg-[#F5F7FB] rounded-lg px-3 py-2">
                Notification will be sent immediately to selected recipients.
              </p>
            )}
          </div>

          {/* Send button */}
          <div className="pt-1">
            <Button
              type="button"
              className="w-full justify-center bg-[#0A3161] hover:bg-[#0D3D7A] disabled:opacity-60"
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending
                ? deliveryMode === "draft"
                  ? "Saving…"
                  : deliveryMode === "schedule"
                    ? "Scheduling…"
                    : "Sending…"
                : submitLabel}
            </Button>
          </div>
        </div>

        {/* Right: User selection list */}
        <div
          ref={userSelectionPanelRef}
          className="bg-white rounded-2xl border border-[#C8D7E9] shadow-md p-6 md:p-7 flex flex-col min-h-[320px] lg:sticky lg:top-6 lg:self-start"
        >
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[#0A3161]">User Selection</h2>
            <p className="mt-2 text-xs text-[#5671A6] bg-[#F5F7FB] rounded-lg px-3 py-2">
              {recipientMode === "custom"
                ? "Click on users below to add or remove them from Custom Selection."
                : recipientMode === "active"
                ? "All active users are automatically selected."
                : "All users are automatically selected."}
            </p>
            
            {/* Search input */}
            <div className="mt-3 relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5671A6]" />
              <Input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="pl-9 h-10 w-full rounded-lg border border-[#C8D7E9] bg-white text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isFetchingUsers ? (
              <div className="py-8">
                <div className="mx-auto flex w-full max-w-sm items-center justify-center gap-3 text-sm font-medium text-[#2158A3]">
                  <span className="h-4 w-4 rounded-full border-2 border-[#0A3161]/30 border-t-[#0A3161] animate-spin" />
                  <span>Loading users…</span>
                </div>
              </div>
            ) : visibleUsers.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#5671A6]">
                No users found matching "{userSearchTerm}"
              </div>
            ) : (
              paginatedVisibleUsers.map((user) => {
              const isSelected =
                recipientMode === "custom"
                  ? selectedUserIds.includes(user.id)
                  : recipientMode === "all"
                  ? true
                  : user.status === "Active";

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleToggleUser(user.id)}
                  className={`w-full flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    isSelected && recipientMode === "custom"
                      ? "border-[#0A3161] bg-[#F5F7FB]"
                      : "border-[#E0E7F5] bg-white hover:bg-[#F5F7FB]/70"
                  } ${recipientMode !== "custom" ? "cursor-default" : ""}`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A3161] text-white text-sm font-semibold">
                      {user.name?.[0] || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0A3161] break-words leading-snug">
                        {user.name}
                      </p>
                      <p className="text-xs text-[#5671A6] break-all leading-snug">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex w-[7.5rem] shrink-0 flex-col items-end gap-1 self-start">
                    {user.goal ? (
                      <span
                        className="inline-flex max-w-full items-center whitespace-normal break-words rounded-full bg-[#E8F3FF] px-2.5 py-0.5 text-[11px] font-medium text-[#0A3161] text-right"
                        title={user.goal}
                      >
                        {user.goal}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                      {user.status}
                    </span>
                  </div>
                </button>
              );
            })
            )}
          </div>

          {/* Pagination (always visible; disabled when not needed) */}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E0E7F5] pt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToUserPage(userPage - 1);
                }}
                disabled={userPage === 1 || totalUserPages <= 1}
                className={`h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  userPage === 1 || totalUserPages <= 1
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-[#0A3161] border-[#C8D7E9] hover:bg-[#F2F5FA]"
                }`}
              >
                Prev
              </button>

              <div className="text-xs text-[#5671A6]">
                Page <span className="font-semibold text-[#0A3161]">{userPage}</span> of{" "}
                <span className="font-semibold text-[#0A3161]">{totalUserPages}</span>
                <span className="mx-2 text-[#5671A6]/60">|</span>
                <span>
                  {visibleUsers.length} user{visibleUsers.length === 1 ? "" : "s"}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToUserPage(userPage + 1);
                }}
                disabled={userPage === totalUserPages || totalUserPages <= 1}
                className={`h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  userPage === totalUserPages || totalUserPages <= 1
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-[#0A3161] border-[#C8D7E9] hover:bg-[#F2F5FA]"
                }`}
              >
                Next
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
