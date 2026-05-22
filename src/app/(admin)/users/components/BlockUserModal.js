"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FaTrashAlt } from "react-icons/fa";

export default function BlockUserModal({ open, user, onCancel, onConfirm, isLoading = false }) {
  if (!open || !user) return null;

  const isCurrentlyBlocked = user.status === "Blocked";

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#0A3161] to-[#0D3D7A] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
              <FaTrashAlt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {isCurrentlyBlocked ? "Unblock User" : "Block User"}
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                This action will {isCurrentlyBlocked ? "restore access for" : "restrict access for"} this user.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 bg-white">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm text-[#2158A3]">
                Are you sure you want to {isCurrentlyBlocked ? "unblock" : "block"} this user?
              </p>

              <div className="mt-4 rounded-xl border border-[#C8D7E9] bg-[#F2F5FA] px-4 py-3">
                <p className="text-xs font-semibold text-[#0A3161] uppercase tracking-wide">
                  User Details
                </p>
                <p className="mt-1.5 text-base font-semibold text-[#0A3161]">
                  {user.name}
                </p>
                {user.email && (
                  <p className="mt-1 text-xs text-[#2158A3]">{user.email}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {user.goal && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 font-medium text-[#0A3161] border border-gray-200">
                      {user.goal}
                    </span>
                  )}
                  {user.status && (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                        user.status === "Active"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      Current: {user.status}
                    </span>
                  )}
                  {user.joinDate && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700 border border-blue-200 text-[11px]">
                      Joined: {user.joinDate}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-3 text-xs text-[#5671A6]">
                You can {isCurrentlyBlocked ? "block this user again later if needed" : "unblock this user later from the same screen"}.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-[#C8D7E9] px-6 py-4 rounded-b-2xl">
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="px-5 border-[#C8D7E9] text-[#0A3161] font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-5 bg-[#0A3161] hover:bg-[#0D3D7A] text-white font-semibold shadow-sm disabled:opacity-60"
            >
              {isLoading ? "Please wait…" : isCurrentlyBlocked ? "Yes, Unblock" : "Yes, Block"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

