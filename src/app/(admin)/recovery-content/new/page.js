"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiOutlineArrowLeft, HiOutlineUpload } from "react-icons/hi";
import { FaRegHeart } from "react-icons/fa";

export default function NewRecoveryPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Breathing");
  const [contentType, setContentType] = useState("Video");
  const [status, setStatus] = useState("Active");
  const [durationOrTarget, setDurationOrTarget] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaError, setMediaError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = [
    "Breathing",
    "Stretching",
    "Sleep",
    "Meditation",
    "Self-Massage",
    "Nutrition",
    "Yoga",
    "Therapy",
    "Relaxation",
    "Hydration",
  ];
  const contentTypeOptions = ["Video", "Article", "Audio", "Image"];

  const chipClasses = (active) =>
    `flex-1 rounded-xl border text-sm font-medium py-2.5 px-4 text-center whitespace-normal break-words leading-snug transition-all ${
      active
        ? "border-[#0A3161] bg-[#0A3161]/5 text-[#0A3161] shadow-sm"
        : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
    }`;

  const getAcceptTypes = () => {
    if (contentType === "Video") return "video/mp4,video/quicktime";
    if (contentType === "Audio") return "audio/mpeg,audio/wav,audio/mp3";
    if (contentType === "Image") return "image/jpeg,image/png,image/webp";
    return "";
  };

  const getMaxSize = () => {
    if (contentType === "Video") return 50 * 1024 * 1024; // 50MB
    if (contentType === "Audio") return 20 * 1024 * 1024; // 20MB
    if (contentType === "Image") return 10 * 1024 * 1024; // 10MB
    return 10 * 1024 * 1024; // Default 10MB
  };

  const handleFileChange = (file) => {
    if (!file) return;

    const maxSize = getMaxSize();
    const validTypes = getAcceptTypes().split(",");

    if (contentType !== "Article" && !validTypes.includes(file.type)) {
      setMediaError(
        contentType === "Video"
          ? "Only MP4 or MOV files are allowed."
          : contentType === "Audio"
            ? "Only MP3, WAV, or MPEG files are allowed."
            : "Only JPEG, PNG, or WEBP images are allowed."
      );
      setMediaFile(null);
      return;
    }

    if (file.size > maxSize) {
      setMediaError(`File size must be less than ${maxSize / (1024 * 1024)}MB.`);
      setMediaFile(null);
      return;
    }

    setMediaError("");
    setMediaFile(file);
  };

  const handleAdd = async () => {
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

    const titleValue = title.trim();
    const descValue = description.trim();

    if (!titleValue || !category || !contentType || !descValue) {
      toast.error("Please fill in all required fields", { id: "recovery-add-required" });
      return;
    }

    if (contentType !== "Article" && !mediaFile) {
      toast.error(`Please upload a ${contentType.toLowerCase()} file`, {
        id: "recovery-add-media-required",
      });
      return;
    }
    if (mediaError) {
      toast.error(mediaError, { id: "recovery-add-media-error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("contentType", contentType);
      formData.append("title", titleValue);
      formData.append("description", descValue);
      formData.append("durationOrTarget", durationOrTarget.trim());
      formData.append("status", status || "Active");

      if (mediaFile) {
        // Backend uses multer; common field is "media".
        formData.append("media", mediaFile);
      }

      const res = await axios.post(`${baseUrl}/api/admin/add-recovery-content`, formData, {
        headers: { token },
      });

      if (res?.data?.success) {
        toast.success(res?.data?.message || "Recovery content added successfully!");
        router.push("/recovery-content");
      } else {
        toast.error(res?.data?.message || "Failed to add recovery content");
      }
    } catch (err) {
      console.error("Add recovery content failed:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || "Failed to add recovery content");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-1">
      {/* Header */}
      <div className="flex items-center gap-4">
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
            <FaRegHeart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A3161] leading-6 whitespace-normal break-words">
              Add New Recovery Content
            </h1>
            <p className="text-sm text-[#2158A3]">Create a new recovery content item</p>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-[#C8D7E9] shadow-md p-6 md:p-7 mt-6">
        {/* Title */}
        <div>
          <label className="text-sm font-medium text-[#0A3161]">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
            placeholder="Enter recovery content title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Category & Content Type */}
        <div className="grid gap-5 md:grid-cols-2 mt-6">
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 grid gap-3 grid-cols-3">
              {categoryOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={chipClasses(category === opt)}
                  onClick={() => setCategory(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Content Type <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 grid gap-3 grid-cols-4">
              {contentTypeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={chipClasses(contentType === opt)}
                  onClick={() => {
                    setContentType(opt);
                    setMediaFile(null);
                    setMediaError("");
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-6">
          <label className="text-sm font-medium text-[#0A3161]">Status</label>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {["Active", "Inactive"].map((opt) => (
              <button
                key={opt}
                type="button"
                className={chipClasses(status === opt)}
                onClick={() => setStatus(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Media (if not Article) */}
        {contentType !== "Article" && (
          <div className="mt-6">
            <label className="text-sm font-medium text-[#0A3161]">
              Upload {contentType === "Video" ? "Video" : contentType === "Audio" ? "Audio" : "Image"}
            </label>

            <input
              type="file"
              accept={getAcceptTypes()}
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleFileChange(file);
              }}
            />

            <div
              className={`mt-2 flex flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-10 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-[#0A3161] bg-[#E3ECF8]"
                  : "border-[#C8D7E9] bg-[#F5F7FB] hover:border-[#0A3161]"
              }`}
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                handleFileChange(file);
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#0A3161] shadow-sm mb-3">
                <HiOutlineUpload className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-[#0A3161]">
                Click to upload or drag and drop
              </p>
              <p className="mt-1 text-xs text-[#5671A6]">
                {contentType === "Video"
                  ? "MP4, MOV (max 50MB)"
                  : contentType === "Audio"
                    ? "MP3, WAV, MPEG (max 20MB)"
                    : "JPEG, PNG, WEBP (max 10MB)"}
              </p>
            </div>

            {mediaFile && (
              <p className="mt-3 text-xs text-[#2158A3] whitespace-normal break-words">
                Selected: <span className="font-medium break-words">{mediaFile.name}</span>{" "}
                ({(mediaFile.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            )}

            {mediaError && <p className="mt-2 text-xs text-red-500">{mediaError}</p>}
          </div>
        )}

        {/* Description */}
        <div className="mt-6">
          <label className="text-sm font-medium text-[#0A3161]">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            className="mt-1.5 w-full border border-[#C8D7E9] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30 resize-none"
            placeholder="Enter recovery content description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Duration / Target */}
        <div className="mt-6">
          <label className="text-sm font-medium text-[#0A3161]">Duration / Target</label>
          <Input
            className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
            placeholder='e.g., "10 min" or "3 sets" (optional)'
            value={durationOrTarget}
            onChange={(e) => setDurationOrTarget(e.target.value)}
          />
        </div>

        {/* Footer buttons */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            onClick={() => router.push("/recovery-content")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full justify-center bg-[#0A3161] hover:bg-[#0D3D7A]"
            onClick={handleAdd}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Recovery Content"}
          </Button>
        </div>
      </div>
    </div>
  );
}
