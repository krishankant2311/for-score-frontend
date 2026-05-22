"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  FaRegEye,
  FaUser,
  FaEnvelope,
  FaBullseye,
  FaUserFriends,
  FaCalendarAlt,
} from "react-icons/fa";
import { TbActivityHeartbeat } from "react-icons/tb";
import { HiClock } from "react-icons/hi";

export default function ViewActiveUserModal({ open, user, onClose }) {
  if (!open || !user) return null;

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#0A3161] to-[#0D3D7A] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
              <FaRegEye className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Active User Details</h2>
              <p className="text-xs text-white/80 mt-0.5">Activity today & profile overview</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Name */}
          <div className="bg-gradient-to-br from-[#F2F5FA] to-white rounded-xl border border-[#C8D7E9] p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A3161]/10 text-[#0A3161] flex-shrink-0">
                <FaUser className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Name
                </label>
                <p className="mt-2 text-lg font-semibold text-[#0A3161] break-words">{user.name}</p>
              </div>
            </div>
          </div>

          {/* Activity Today: Last Active, First Seen, Sessions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <TbActivityHeartbeat className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Last Active
                </label>
              </div>
              <p className="mt-2 text-sm font-medium text-[#0A3161]">{user.lastActiveAt}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <HiClock className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  First Seen Today
                </label>
              </div>
              <p className="mt-2 text-sm font-medium text-[#0A3161]">{user.firstSeenToday}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <TbActivityHeartbeat className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Sessions Today
                </label>
              </div>
              <p className="mt-2">
                <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-3 py-1.5 text-sm font-medium border border-green-200">
                  {user.sessionsToday}
                </span>
              </p>
            </div>
          </div>

          {/* Email, Goal, Body Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <FaEnvelope className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Email
                </label>
              </div>
              <p className="mt-1 text-sm font-medium text-[#0A3161] break-words">{user.email}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <FaBullseye className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Goal
                </label>
              </div>
              <p className="mt-2">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-[#0A3161] border border-gray-200">
                  {user.goal}
                </span>
              </p>
            </div>
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <FaUserFriends className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Body Type
                </label>
              </div>
              <p className="mt-2 text-sm font-medium text-[#0A3161]">{user.bodyType}</p>
            </div>
          </div>

          {/* Weekly Days, Join Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <FaUserFriends className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Weekly Workout Days
                </label>
              </div>
              <p className="mt-2 text-sm font-medium text-[#0A3161]">{user.weeklyDays}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                  <FaCalendarAlt className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Join Date
                </label>
              </div>
              <p className="mt-2 text-sm font-medium text-[#0A3161]">{user.joinDate}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-[#C8D7E9] px-6 py-4 rounded-b-2xl">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 border-[#C8D7E9] text-[#0A3161] font-medium"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
