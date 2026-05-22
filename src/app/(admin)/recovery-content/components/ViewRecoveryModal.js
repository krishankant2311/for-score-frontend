"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  FaRegEye,
  FaFileAlt,
  FaTag,
  FaVideo,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
} from "react-icons/fa";
import { FaHeadphones } from "react-icons/fa6";

export default function ViewRecoveryModal({ open, recoveryItem, onClose }) {
  if (!open || !recoveryItem) return null;

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

  const getContentTypeIcon = () => {
    switch (recoveryItem.contentType) {
      case "Video":
        return <FaVideo className="h-4 w-4" />;
      case "Audio":
        return <FaHeadphones className="h-4 w-4" />;
      case "Article":
        return <FaFileAlt className="h-4 w-4" />;
      default:
        return <FaFileAlt className="h-4 w-4" />;
    }
  };

  const getContentTypeColor = () => {
    switch (recoveryItem.contentType) {
      case "Video":
        return "bg-blue-100 text-blue-700";
      case "Audio":
        return "bg-purple-100 text-purple-700";
      case "Article":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

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
              <h2 className="text-xl font-semibold text-white">View Recovery Content Details</h2>
              <p className="text-xs text-white/80 mt-0.5">Recovery content information overview</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Title Card */}
          <div className="bg-gradient-to-br from-[#F2F5FA] to-white rounded-xl border border-[#C8D7E9] p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A3161]/10 text-[#0A3161] flex-shrink-0">
                <FaFileAlt className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Title
                </label>
                <p className="mt-2 text-lg font-semibold text-[#0A3161] break-words">
                  {recoveryItem.title}
                </p>
              </div>
            </div>
          </div>

          {/* Grid Layout for Category, Content Type, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category */}
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <FaTag className="h-4 w-4" />
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Category
                </label>
              </div>
              <p className="mt-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium ${categoryBadgeClass(
                    recoveryItem.category
                  )}`}
                >
                  {recoveryItem.category}
                </span>
              </p>
            </div>

            {/* Content Type */}
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${getContentTypeColor()}`}>
                  {getContentTypeIcon()}
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Content Type
                </label>
              </div>
              <p className="mt-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium border ${
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
              </p>
            </div>

            {/* Status */}
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    recoveryItem.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {recoveryItem.status === "Active" ? (
                    <FaCheckCircle className="h-4 w-4" />
                  ) : (
                    <FaTimesCircle className="h-4 w-4" />
                  )}
                </div>
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Status
                </label>
              </div>
              <p className="mt-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium border ${
                    recoveryItem.status === "Active"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-red-100 text-red-800 border-red-200"
                  }`}
                >
                  {recoveryItem.status}
                </span>
              </p>
            </div>
          </div>

          {/* Description */}
          {recoveryItem.description && (
            <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm">
              <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                Description
              </label>
              <p className="mt-2 text-sm text-[#0A3161] leading-relaxed">
                {recoveryItem.description}
              </p>
            </div>
          )}

          {/* Created At */}
          <div className="bg-white rounded-xl border border-[#C8D7E9] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <FaCalendarAlt className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-[#5671A6] uppercase tracking-wide">
                  Created At
                </label>
                <p className="mt-1.5 text-sm font-medium text-[#0A3161]">
                  {recoveryItem.createdAt}
                </p>
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
