"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FaTrashAlt } from "react-icons/fa";

const getLevelBadgeClass = (level) => {
  const key = String(level ?? "").toLowerCase();
  if (key.includes("beginner")) return "bg-sky-50 text-sky-800 border-sky-200";
  if (key.includes("intermediate")) return "bg-amber-50 text-amber-800 border-amber-200";
  if (key.includes("advanced")) return "bg-rose-50 text-rose-800 border-rose-200";
  return "bg-blue-50 text-blue-800 border-blue-100";
};

export default function DeleteProgramModal({ open, program, onCancel, onConfirm, isDeleting }) {
  if (!open || !program) return null;

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
      onClick={() => !isDeleting && onCancel()}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-program-title"
      >
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#0A3161] to-[#0D3D7A] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
              <FaTrashAlt className="h-5 w-5" />
            </div>
            <div>
              <h2 id="delete-program-title" className="text-xl font-semibold text-white">
                Delete program
              </h2>
              <p className="text-xs text-white/80 mt-0.5">This action cannot be undone. Please confirm.</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 bg-white">
          <p className="text-sm text-[#2158A3]">
            Are you sure you want to permanently delete this fitness program?
          </p>

          <div className="rounded-xl border border-[#C8D7E9] bg-[#F2F5FA] px-4 py-3">
            <p className="text-xs font-semibold text-[#0A3161] uppercase tracking-wide">Program to be deleted</p>
            <p className="mt-1.5 text-base font-semibold text-[#0A3161]">{program.title}</p>
            {program.subHeader ? (
              <p className="mt-1 text-sm text-[#5671A6] line-clamp-2">{program.subHeader}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {program.level ? (
                <span
                  className={[
                    "inline-flex items-center rounded-full px-3 py-1 font-medium border",
                    getLevelBadgeClass(program.level),
                  ].join(" ")}
                >
                  {program.level}
                </span>
              ) : null}
              {program.durationWeeks != null ? (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 font-medium text-[#0A3161] border border-gray-200">
                  {program.durationWeeks} weeks
                </span>
              ) : null}
              {program.status ? (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                    program.status === "Active"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  {program.status}
                </span>
              ) : null}
            </div>
          </div>

          <p className="text-xs text-[#5671A6]">
            Members will no longer see this program once it is removed from the catalog.
          </p>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-[#C8D7E9] px-6 py-4 rounded-b-2xl">
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isDeleting}
              className="px-5 border-[#C8D7E9] text-[#0A3161] font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-5 bg-[#0A3161] hover:bg-[#0D3D7A] text-white font-semibold shadow-sm"
            >
              {isDeleting ? "Deleting…" : "Yes, delete"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
