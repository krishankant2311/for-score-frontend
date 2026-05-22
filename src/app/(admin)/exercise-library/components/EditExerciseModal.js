"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiOutlineUpload } from "react-icons/hi";
import { toast } from "react-hot-toast";

export default function EditExerciseModal({ open, exercise, onCancel, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    difficulty: "Beginner",
    mediaType: "Video",
    status: "Active",
    instructions: "",
    alternateExercise: "",
  });
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaError, setMediaError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const difficultyOptions = ["Beginner", "Intermediate", "Advanced"];
  const mediaOptions = ["Video", "Image", "GIF"];
  const categoryOptions = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Glutes", "Core", "Cardio", "Other"];

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

  useEffect(() => {
    if (exercise) {
      setFormData({
        title: exercise.title || "",
        category: exercise.category || "",
        difficulty: exercise.difficulty || "Beginner",
        mediaType: exercise.mediaType || "Video",
        status: exercise.status || "Active",
        instructions: exercise.instructions || "",
        alternateExercise: exercise.alternateExercise || "",
      });
    }
  }, [exercise]);

  useEffect(() => {
    // Reset file selection when media type changes.
    setMediaError("");
    setMediaFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [formData.mediaType]);

  const chipClasses = (active) =>
    `flex-1 rounded-xl border text-sm font-medium py-2.5 px-4 text-center transition-all ${
      active
        ? "border-[#0A3161] bg-[#0A3161]/5 text-[#0A3161] shadow-sm"
        : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
    }`;

  const handleFileChange = (file) => {
    if (!file) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    const cfg = getMediaConfig(formData.mediaType);

    if (!isAllowedFile(file, cfg)) {
      const msg = `Media type is "${formData.mediaType}". Please upload ${cfg.label}.`;
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

  const handleSave = () => {
    if (!formData.title || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    onSave({
      ...exercise,
      ...formData,
      mediaFile: mediaFile,
    });
  };

  if (!open || !exercise) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-[#0A3161] mb-4">Edit Exercise</h2>

        <div className="space-y-6">
          {/* Title & Category */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#0A3161]">
                Exercise Title <span className="text-red-500">*</span>
              </label>
              <Input
                className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
                placeholder="Enter exercise title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0A3161]">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm text-[#0A3161] shadow-none outline-none focus:ring-2 focus:ring-[#0A3161]/30"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="" disabled>
                  Select category
                </option>
                {formData.category && !categoryOptions.includes(formData.category) ? (
                  <option value={formData.category}>{formData.category}</option>
                ) : null}
                {categoryOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Difficulty Level <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {difficultyOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={chipClasses(formData.difficulty === opt)}
                  onClick={() => setFormData({ ...formData, difficulty: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Media Type */}
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Media Type <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {mediaOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={chipClasses(formData.mediaType === opt)}
                  onClick={() => setFormData({ ...formData, mediaType: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          {/* <div>
            <label className="text-sm font-medium text-[#0A3161]">Status</label>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {["Active", "Inactive"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={chipClasses(formData.status === opt)}
                  onClick={() => setFormData({ ...formData, status: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div> */}

          {/* Upload Media */}
          <div>
            <label className="text-sm font-medium text-[#0A3161]">Upload Media</label>

            <input
              type="file"
              accept={getMediaConfig(formData.mediaType).accept}
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
                {getMediaConfig(formData.mediaType).label} (max 50MB)
              </p>
            </div>

            {mediaFile && (
              <p className="mt-3 text-xs text-[#2158A3]">
                Selected: <span className="font-medium">{mediaFile.name}</span>{" "}
                ({(mediaFile.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            )}

            {mediaError && (
              <p className="mt-2 text-xs text-red-500">{mediaError}</p>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Instructions <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="mt-1.5 w-full border border-[#C8D7E9] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30 resize-none"
              placeholder="Enter exercise instructions..."
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            />
          </div>

          {/* Alternate Exercise */}
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Alternate Exercise{" "}
              <span className="text-xs font-normal text-[#5671A6]">(Optional)</span>
            </label>
            <Input
              className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
              placeholder="Enter alternate exercise..."
              value={formData.alternateExercise}
              onChange={(e) =>
                setFormData({ ...formData, alternateExercise: e.target.value })
              }
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} className="px-4">
            Cancel
          </Button>
          <Button className="px-4 bg-[#0A3161] hover:bg-[#0D3D7A]" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
