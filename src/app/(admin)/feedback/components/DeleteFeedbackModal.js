"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FaTrashAlt } from "react-icons/fa";

export default function DeleteFeedbackModal({ open, feedback, isDeleting, onCancel, onConfirm }) {
  if (!open || !feedback) return null;

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") !isDeleting && onCancel?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel, isDeleting]);

  if (!isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      onClick={() => !isDeleting && onCancel?.()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#0A3161] to-[#0D3D7A] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
              <FaTrashAlt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Delete Feedback</h2>
              <p className="text-xs text-white/80 mt-0.5">This action cannot be undone. Please confirm.</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 bg-white">
          <p className="text-sm text-[#2158A3]">Are you sure you want to permanently delete this feedback?</p>

          <div className="rounded-xl border border-[#C8D7E9] bg-[#F2F5FA] px-4 py-3">
            <p className="text-xs font-semibold text-[#0A3161] uppercase tracking-wide">Feedback to be deleted</p>
            <p className="mt-1.5 text-base font-semibold text-[#0A3161]">
              {feedback.userName || "—"}
              {feedback.userEmail ? ` (${feedback.userEmail})` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                  feedback.statusKey === "resolved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : feedback.statusKey === "inprogress"
                      ? "bg-sky-50 text-sky-900 border-sky-200"
                      : "bg-amber-50 text-amber-900 border-amber-200"
                }`}
              >
                {feedback.status}
              </span>
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 font-medium text-[#2158A3] border border-[#C8D7E9]">
                Created: {feedback.createdAt}
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-[#C8D7E9] bg-white p-4 text-sm text-[#0A3161] fs-line-clamp-3">
              {feedback.message || "—"}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-[#C8D7E9] px-6 py-4 rounded-b-2xl">
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isDeleting}
              className="px-5 border-[#C8D7E9] text-[#0A3161] font-medium"
            >
              Cancel
            </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 bg-[#0A3161] hover:bg-[#0D3D7A] text-white font-semibold shadow-sm"
          >
            {isDeleting ? "Deleting…" : "Yes, Delete"}
          </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

