"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FaTrashAlt } from "react-icons/fa";

export default function DeleteNutritionModal({ open, nutritionItem, onCancel, onConfirm }) {
  const categoryBadgeClass = (category) => {
    switch (String(category || "").toLowerCase()) {
      case "breakfast":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "lunch":
        return "bg-amber-100 text-amber-900 border-amber-200";
      case "dinner":
        return "bg-indigo-100 text-indigo-900 border-indigo-200";
      case "snack":
        return "bg-emerald-100 text-emerald-900 border-emerald-200";
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
  if (!open || !nutritionItem) return null;

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
              <h2 className="text-xl font-semibold text-white">Delete Nutrition Item</h2>
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
                Are you sure you want to permanently delete this nutrition item?
              </p>

              <div className="mt-4 rounded-xl border border-[#C8D7E9] bg-[#F2F5FA] px-4 py-3">
                <p className="text-xs font-semibold text-[#0A3161] uppercase tracking-wide">
                  Nutrition Item to be deleted
                </p>
                <p className="mt-1.5 text-base font-semibold text-[#0A3161] whitespace-normal break-words">
                  {nutritionItem.foodItem}
                </p>
                {nutritionItem.category && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 font-medium ${categoryBadgeClass(
                        nutritionItem.category
                      )}`}
                    >
                      {nutritionItem.category}
                    </span>
                    {nutritionItem.mealType && (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 font-medium border text-xs ${
                          nutritionItem.mealType === "Vegetarian"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : nutritionItem.mealType === "Non-Vegetarian"
                              ? "bg-red-100 text-red-800 border-red-200"
                              : "bg-purple-100 text-purple-800 border-purple-200"
                        }`}
                      >
                        {nutritionItem.mealType}
                      </span>
                    )}
                    {nutritionItem.status && (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                          nutritionItem.status === "Active"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {nutritionItem.status}
                      </span>
                    )}
                    {nutritionItem.calories && (
                      <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-700 border border-orange-200 text-xs">
                        {nutritionItem.calories} kcal
                      </span>
                    )}
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs text-[#5671A6]">
                Once deleted, this nutrition item and its data will no longer be available in the
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
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="px-5 bg-[#0A3161] hover:bg-[#0D3D7A] text-white font-semibold shadow-sm"
            >
              Yes, Delete
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
