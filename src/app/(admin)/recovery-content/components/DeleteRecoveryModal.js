"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FaTrashAlt } from "react-icons/fa";

export default function DeleteRecoveryModal({
  open,
  recoveryItem,
  isDeleting = false,
  onCancel,
  onConfirm,
}) {
  const categoryBadgeClass = (category) => {
    switch (String(category || "").toLowerCase()) {
      case "breathing":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "stretching":
        return "bg-emerald-100 text-emerald-900 border-emerald-200";
      case "sleep":
        return "bg-indigo-100 text-indigo-900 border-indigo-200";
      case "meditation":
        return "bg-violet-100 text-violet-900 border-violet-200";
      case "self-massage":
      case "self massage":
        return "bg-amber-100 text-amber-900 border-amber-200";
      case "nutrition":
        return "bg-orange-100 text-orange-900 border-orange-200";
      case "yoga":
        return "bg-teal-100 text-teal-900 border-teal-200";
      case "therapy":
        return "bg-rose-100 text-rose-900 border-rose-200";
      case "relaxation":
        return "bg-slate-200 text-slate-800 border-slate-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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
  if (!open || !recoveryItem) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm"
      onClick={() => {
        if (!isDeleting) onCancel?.();
      }}
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
              <h2 className="text-xl font-semibold text-white">Delete Recovery Content</h2>
              <p className="text-xs text-white/80 mt-0.5">
                This action cannot be undone. Please confirm.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 bg-white">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm text-[#2158A3]">
                Are you sure you want to permanently delete this recovery content?
              </p>

              <div className="mt-4 rounded-xl border border-[#C8D7E9] bg-[#F2F5FA] px-4 py-3">
                <p className="text-xs font-semibold text-[#0A3161] uppercase tracking-wide">
                  Recovery Content to be deleted
                </p>
                <p className="mt-1.5 text-base font-semibold text-[#0A3161] whitespace-normal break-words">
                  {recoveryItem.title}
                </p>
                {recoveryItem.category && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 font-medium ${categoryBadgeClass(
                        recoveryItem.category
                      )}`}
                    >
                      {recoveryItem.category}
                    </span>
                    {recoveryItem.contentType && (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 font-medium border text-xs ${
                          recoveryItem.contentType === "Video"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : recoveryItem.contentType === "Audio"
                              ? "bg-purple-100 text-purple-800 border-purple-200"
                              : recoveryItem.contentType === "Article"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-gray-100 text-gray-800 border-gray-200"
                        }`}
                      >
                        {recoveryItem.contentType}
                      </span>
                    )}
                    {recoveryItem.status && (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                          recoveryItem.status === "Active"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {recoveryItem.status}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs text-[#5671A6]">
                Once deleted, this recovery content and its data will no longer be available in the
                library.
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
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="px-5 bg-[#0A3161] hover:bg-[#0D3D7A] text-white font-semibold shadow-sm"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
