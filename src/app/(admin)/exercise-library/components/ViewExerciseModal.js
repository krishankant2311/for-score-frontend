"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FaRegEye, FaDumbbell, FaTag, FaChartLine, FaFileVideo, FaCheckCircle, FaTimesCircle, FaCalendarAlt } from "react-icons/fa";

export default function ViewExerciseModal({ open, exercise, onClose }) {
  if (!open || !exercise) return null;

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

  return (
    createPortal(
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
              <h2 className="text-xl font-semibold text-white">View Exercise Details</h2>
              <p className="text-xs text-white/80 mt-0.5">Exercise information overview</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Exercise Title Card */}
          <div className="bg-gradient-to-br from-[#F2F5FA] to-white rounded-xl border border-[#C8D7E9] p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A3161]/10 text-[#0A3161] flex-shrink-0">
                <FaDumbbell className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">Exercise Title</label>
                <p className="mt-2 text-lg font-semibold text-[#0A3161] break-words">{exercise.title}</p>
              </div>
            </div>
          </div>

          {/* Grid Layout for Category, Difficulty, Media Type, Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <FaTag className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">Category</label>
              </div>
              <p className="mt-2">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-[#0A3161] border border-gray-200">
                  {exercise.category}
                </span>
              </p>
            </div>

            {/* Difficulty Level */}
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  exercise.difficulty === "Beginner"
                    ? "bg-blue-100 text-blue-700"
                    : exercise.difficulty === "Intermediate"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                }`}>
                  <FaChartLine className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">Difficulty Level</label>
              </div>
              <p className="mt-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${
                    exercise.difficulty === "Beginner"
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : exercise.difficulty === "Intermediate"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-red-100 text-red-800 border border-red-200"
                  }`}
                >
                  {exercise.difficulty}
                </span>
              </p>
            </div>

            {/* Media Type */}
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <FaFileVideo className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">Media Type</label>
              </div>
              <p className="mt-2 text-base font-medium text-[#0A3161]">{exercise.mediaType}</p>
            </div>

            {/* Status */}
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  exercise.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {exercise.status === "Active" ? (
                    <FaCheckCircle className="h-4 w-4" />
                  ) : (
                    <FaTimesCircle className="h-4 w-4" />
                  )}
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">Status</label>
              </div>
              <p className="mt-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${
                    exercise.status === "Active"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}
                >
                  {exercise.status}
                </span>
              </p>
            </div>
          </div>

          {/* Created At */}
          <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <FaCalendarAlt className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">Created At</label>
                <p className="mt-1.5 text-sm font-medium text-[#0A3161]">{exercise.createdAt}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-[#C8D7E9] px-6 py-4 rounded-b-2xl">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6  border-[#C8D7E9] text-[#0A3161] font-medium"
            >
              Close
            </Button>
          </div>
        </div>
        </div>
      </div>,
      document.body
    )
  );
}
