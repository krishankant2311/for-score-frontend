"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiOutlineArrowLeft, HiOutlineUpload } from "react-icons/hi";
import { LiaDnaSolid } from "react-icons/lia";
import { toast } from "react-hot-toast";

export default function NewExercisePage() {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [difficulty, setDifficulty] = useState("Beginner");
  const [mediaType, setMediaType] = useState("Video");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaError, setMediaError] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  // Backend curl examples me "none" bheja ja raha hai, isliye default yahi rakhte hain.
  const [instructions, setInstructions] = useState("none");
  const [alternateExercise, setAlternateExercise] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const difficultyOptions = ["Beginner", "Intermediate", "Advanced"];
  const mediaOptions = ["Video", "Image", "GIF"];
  const categoryOptions = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Glutes", "Core", "Cardio", "Other"];

  const chipClasses = (active) =>
    `flex-1 rounded-xl border text-sm font-medium py-2.5 px-4 text-center transition-all ${
      active
        ? "border-[#0A3161] bg-[#0A3161]/5 text-[#0A3161] shadow-sm"
        : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
    }`;

  const getMediaConfig = (type) => {
    switch (type) {
      case "Image":
        return {
          label: "JPG, PNG, WEBP",
          accept: "image/jpeg,image/png,image/webp",
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
          extensions: [".jpg", ".jpeg", ".png", ".webp"],
        };
      case "GIF":
        return {
          label: "GIF",
          accept: "image/gif",
          mimeTypes: ["image/gif"],
          extensions: [".gif"],
        };
      case "Video":
      default:
        return {
          label: "MP4, MOV",
          accept: "video/mp4,video/quicktime",
          mimeTypes: ["video/mp4", "video/quicktime"],
          extensions: [".mp4", ".mov"],
        };
    }
  };

  const isAllowedFile = (file, cfg) => {
    const mime = (file?.type || "").toLowerCase();
    if (mime && cfg.mimeTypes.includes(mime)) return true;
    const name = (file?.name || "").toLowerCase();
    return cfg.extensions.some((ext) => name.endsWith(ext));
  };

  const validateAndSetFile = (file) => {
    if (!file) return;

    const cfg = getMediaConfig(mediaType);
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!isAllowedFile(file, cfg)) {
      const msg = `Media type is "${mediaType}". Please upload ${cfg.label}.`;
      setMediaError(msg);
      toast.error(msg);
      setMediaFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > maxSize) {
      const msg = "File size must be less than 50MB.";
      setMediaError(msg);
      toast.error(msg);
      setMediaFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setMediaError("");
    setMediaFile(file);
  };

  return (
    <div className="min-h-[80vh] py-8 px-1">
      {/* Header */}
      <div className="flex items-center gap-4 ">
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
            <LiaDnaSolid className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A3161] leading-6">
              Add New Exercise
            </h1>
            <p className="text-sm text-[#2158A3]">Create a new exercise</p>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-[#C8D7E9] shadow-md p-6 md:p-7 mt-6">
        {/* Title & Category */}
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Exercise Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
              placeholder="Enter exercise title"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm text-[#0A3161] shadow-none outline-none focus:ring-2 focus:ring-[#0A3161]/30"
            >
              <option value="" disabled>
                Select category
              </option>
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Difficulty Level */}
        <div className="mt-6">
          <label className="text-sm font-medium text-[#0A3161]">
            Difficulty Level <span className="text-red-500">*</span>
          </label>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            {difficultyOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={chipClasses(difficulty === opt)}
                onClick={() => setDifficulty(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Media Type */}
        <div className="mt-6">
          <label className="text-sm font-medium text-[#0A3161]">
            Media Type <span className="text-red-500">*</span>
          </label>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            {mediaOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={chipClasses(mediaType === opt)}
                onClick={() => {
                  setMediaType(opt);
                  setMediaError("");
                  setMediaFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Media */}
        <div className="mt-6">
          <label className="text-sm font-medium text-[#0A3161]">Upload Media</label>

          <input
            type="file"
            accept={getMediaConfig(mediaType).accept}
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              validateAndSetFile(e.target.files?.[0]);
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

              validateAndSetFile(e.dataTransfer.files?.[0]);
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#0A3161] shadow-sm mb-3">
              <HiOutlineUpload className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-[#0A3161]">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-[#5671A6]">
              {getMediaConfig(mediaType).label} (max 50MB)
            </p>
          </div>

          {mediaFile && (
            <p className="mt-3 text-xs text-[#2158A3]">
              Selected: <span className="font-medium">{mediaFile.name}</span>{" "}
              ({(mediaFile.size / (1024 * 1024)).toFixed(1)} MB)
            </p>
          )}

          {mediaError && (
            <p className="mt-2 text-xs text-red-500">
              {mediaError}
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6">
          <label className="text-sm font-medium text-[#0A3161]">
            Instructions <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            className="mt-1.5 w-full border border-[#C8D7E9] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30 resize-none"
            placeholder="Enter exercise instructions..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        {/* Alternate Exercise */}
        <div className="mt-6">
          <label className="text-sm font-medium text-[#0A3161]">
            Alternate Exercise <span className="text-xs font-normal text-[#5671A6]">
              (Optional)
            </span>
          </label>
          <Input
            value={alternateExercise}
            onChange={(e) => setAlternateExercise(e.target.value)}
            className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
            placeholder="Enter alternate exercise..."
          />
        </div>

        {/* Footer buttons */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            onClick={() => router.push("/exercise-library")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full justify-center bg-[#0A3161] hover:bg-[#0D3D7A]"
            onClick={async () => {
              if (submitLockRef.current) return;
              submitLockRef.current = true;
              try {
                if (!title.trim() || !category.trim()) {
                  toast.error("Please fill Title and Category.", { id: "exercise-add-required" });
                  window.setTimeout(() => {
                    submitLockRef.current = false;
                  }, 600);
                  return;
                }

                const token = localStorage.getItem("token");
                const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

                if (!baseUrl) {
                  toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).", {
                    id: "exercise-add-baseurl-missing",
                  });
                  window.setTimeout(() => {
                    submitLockRef.current = false;
                  }, 600);
                  return;
                }
                if (!token) {
                  toast.error("Session expired. Please login again.", { id: "exercise-add-token-missing" });
                  window.setTimeout(() => {
                    submitLockRef.current = false;
                  }, 600);
                  return;
                }

                setIsSubmitting(true);

                const instructionsValue = instructions.trim() ? instructions.trim() : "none";

                // If backend expects email, we can derive it from JWT payload.
                const tokenPayload = (() => {
                  if (!token) return null;
                  try {
                    const base64Url = token.split(".")[1];
                    if (!base64Url) return null;
                    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
                    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
                    return JSON.parse(atob(padded));
                  } catch (e) {
                    return null;
                  }
                })();

                const emailFromToken = tokenPayload?.email;

                const formData = new FormData();
                formData.append("title", title.trim());
                formData.append("category", category.trim());
                formData.append("difficultyLevel", difficulty);
                formData.append("mediaType", mediaType);
                formData.append("instructions", instructionsValue);
                formData.append("alternateExercise", alternateExercise.trim());
                if (emailFromToken) formData.append("email", emailFromToken);

                // Optional: backend accepts request even without a file (like your curl).
                // If user selected a file, send it using the backend-expected field name.
                if (mediaFile) {
                  formData.append("media", mediaFile);
                }

                const res = await axios.post(
                  `${baseUrl}/api/admin/exercises`,
                  formData,
                  { headers: { token } }
                );
                console.log(res);

                if (res?.data?.success) {
                  toast.success("Exercise added successfully!");
                  router.push("/exercise-library");
                } else {
                  toast.error(res?.data?.message || "Failed to add exercise");
                }
              } catch (err) {
                console.error("Add exercise failed:", err?.response?.data || err?.message);
                toast.error(err?.response?.data?.message || "Failed to add exercise");
              } finally {
                setIsSubmitting(false);
                // If we scheduled a delayed unlock (validation), don't override it.
                // Otherwise unlock immediately after request finishes.
                if (submitLockRef.current) submitLockRef.current = false;
              }
            }}
            disabled={isSubmitting}
            aria-disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Exercise"}
          </Button>
        </div>
      </div>
    </div>
  );
}

