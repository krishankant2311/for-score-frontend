"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiOutlineArrowLeft, HiOutlineUpload } from "react-icons/hi";
import { FaUtensils } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function EditNutritionPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params?.id;

  const [nutritionItem, setNutritionItem] = useState(null);
  const [foodItem, setFoodItem] = useState("");
  const [category, setCategory] = useState("Breakfast");
  const [mealType, setMealType] = useState("Vegetarian");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [status, setStatus] = useState("Active");
  const [description, setDescription] = useState("");
  const [alternateFood, setAlternateFood] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageError, setImageError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = ["Breakfast", "Lunch", "Dinner", "Snack"];
  const mealTypeOptions = ["Vegetarian", "Non-Vegetarian", "Vegan"];

  const MACRO_LIMITS = {
    calories: { min: 0, max: 9999, label: "Calories" },
    grams: { min: 0, max: 999, label: "grams" },
  };

  const normalizeNumberInput = (raw, { min, max }) => {
    const s = String(raw ?? "");
    if (s === "") return "";
    const digits = s.replace(/[^\d]/g, "");
    if (digits === "") return "";
    const n = Number(digits);
    if (Number.isNaN(n)) return "";
    return String(Math.min(max, Math.max(min, n)));
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("nutrition_edit_item");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed) return;
      setNutritionItem(parsed);
      setFoodItem(parsed.foodItem || "");
      setCategory(parsed.category || "Breakfast");
      setMealType(parsed.mealType || "Vegetarian");
      setCalories(parsed.calories?.toString?.() || String(parsed.calories ?? ""));
      setProtein(parsed.protein?.toString?.() || String(parsed.protein ?? ""));
      setCarbs(parsed.carbs?.toString?.() || String(parsed.carbs ?? ""));
      setFats(parsed.fats?.toString?.() || String(parsed.fats ?? ""));
      setStatus(parsed.status || "Active");
      setDescription(parsed.description || "");
      setAlternateFood(parsed.alternateFood || "");
    } catch {
      // ignore
    }
  }, []);

  const chipClasses = (active) =>
    `flex-1 rounded-xl border text-sm font-medium py-2.5 px-4 text-center transition-all ${
      active
        ? "border-[#0A3161] bg-[#0A3161]/5 text-[#0A3161] shadow-sm"
        : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
    }`;

  const handleFileChange = (file) => {
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!validTypes.includes(file.type)) {
      setImageError("Only JPEG, PNG, or WEBP images are allowed.");
      setImageFile(null);
      return;
    }

    if (file.size > maxSize) {
      setImageError("File size must be less than 10MB.");
      setImageFile(null);
      return;
    }

    setImageError("");
    setImageFile(file);
  };

  const handleSave = async () => {
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

    if (
      !foodItem.trim() ||
      !category ||
      !mealType ||
      !String(calories).trim() ||
      !String(protein).trim() ||
      !String(carbs).trim() ||
      !String(fats).trim() ||
      !description.trim()
    ) {
      toast.error("Please fill in all required fields", {
        id: "nutrition-edit-required",
      });
      return;
    }
    if (imageError) {
      toast.error(imageError, { id: "nutrition-edit-image" });
      return;
    }

    const c = Number(String(calories).trim());
    const p = Number(String(protein).trim());
    const cb = Number(String(carbs).trim());
    const ft = Number(String(fats).trim());
    if (
      [c, p, cb, ft].some((n) => Number.isNaN(n)) ||
      c < MACRO_LIMITS.calories.min ||
      c > MACRO_LIMITS.calories.max ||
      p < MACRO_LIMITS.grams.min ||
      p > MACRO_LIMITS.grams.max ||
      cb < MACRO_LIMITS.grams.min ||
      cb > MACRO_LIMITS.grams.max ||
      ft < MACRO_LIMITS.grams.min ||
      ft > MACRO_LIMITS.grams.max
    ) {
      toast.error(
        `Macros out of range. Calories: ${MACRO_LIMITS.calories.min}-${MACRO_LIMITS.calories.max}, Protein/Carbs/Fats: ${MACRO_LIMITS.grams.min}-${MACRO_LIMITS.grams.max}.`,
        { id: "nutrition-edit-macro-range" }
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", foodItem.trim());
      formData.append("category", category);
      formData.append("mealType", mealType);
      formData.append("calories", String(calories).trim());
      formData.append("protein", String(protein).trim());
      formData.append("carbs", String(carbs).trim());
      formData.append("fats", String(fats).trim());
      formData.append("description", description.trim());
      formData.append("alternateFood", alternateFood.trim());
      formData.append("status", status || "Active");
      if (imageFile) formData.append("image", imageFile);

      const res = await axios.put(
        `${baseUrl}/api/admin/update-nutrition-items/${itemId}`,
        formData,
        { headers: { token } }
      );

      if (res?.data?.success) {
        toast.success(res?.data?.message || "Nutrition item updated successfully!");
        try {
          sessionStorage.removeItem("nutrition_edit_item");
        } catch {
          // ignore
        }
        router.push("/nutrition-macros");
      } else {
        toast.error(res?.data?.message || "Failed to update nutrition item");
      }
    } catch (err) {
      console.error("Update nutrition item failed:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || "Failed to update nutrition item");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!nutritionItem) {
    return (
      <div className="min-h-[80vh] py-8 px-1 flex items-center justify-center">
        <p className="text-[#2158A3]">Loading...</p>
      </div>
    );
  }

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
            <FaUtensils className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A3161] leading-6">Edit Nutrition Item</h1>
            <p className="text-sm text-[#2158A3]">Update nutrition item details</p>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-[#C8D7E9] shadow-md p-6 md:p-7 mt-6">
        {/* Food Item Name */}
        <div>
          <label className="text-sm font-medium text-[#0A3161]">
            Food Item Name <span className="text-red-500">*</span>
          </label>
          <Input
            className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
            placeholder="Enter food item name"
            value={foodItem}
            onChange={(e) => setFoodItem(e.target.value)}
          />
        </div>

        {/* Category & Meal Type */}
        <div className="grid gap-5 md:grid-cols-2 mt-6">
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 grid gap-3 grid-cols-2">
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
              Meal Type <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 grid gap-3 grid-cols-3">
              {mealTypeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={chipClasses(mealType === opt)}
                  onClick={() => setMealType(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="grid gap-5 md:grid-cols-4 mt-6">
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Calories (kcal) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={MACRO_LIMITS.calories.min}
              max={MACRO_LIMITS.calories.max}
              inputMode="numeric"
              className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
              placeholder="0"
              value={calories}
              onChange={(e) =>
                setCalories(normalizeNumberInput(e.target.value, MACRO_LIMITS.calories))
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Protein (g) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={MACRO_LIMITS.grams.min}
              max={MACRO_LIMITS.grams.max}
              inputMode="numeric"
              className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
              placeholder="0"
              value={protein}
              onChange={(e) =>
                setProtein(normalizeNumberInput(e.target.value, MACRO_LIMITS.grams))
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Carbs (g) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={MACRO_LIMITS.grams.min}
              max={MACRO_LIMITS.grams.max}
              inputMode="numeric"
              className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
              placeholder="0"
              value={carbs}
              onChange={(e) =>
                setCarbs(normalizeNumberInput(e.target.value, MACRO_LIMITS.grams))
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#0A3161]">
              Fats (g) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={MACRO_LIMITS.grams.min}
              max={MACRO_LIMITS.grams.max}
              inputMode="numeric"
              className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
              placeholder="0"
              value={fats}
              onChange={(e) =>
                setFats(normalizeNumberInput(e.target.value, MACRO_LIMITS.grams))
              }
            />
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

        {/* Upload Image */}
        <div className="mt-6">
          <label className="text-sm font-medium text-[#0A3161]">Upload Image</label>

          <input
            type="file"
            accept="image/*"
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
            <p className="mt-1 text-xs text-[#5671A6]">JPEG, PNG, WEBP (max 10MB)</p>
          </div>

          {imageFile && (
            <p className="mt-3 text-xs text-[#2158A3]">
              Selected: <span className="font-medium">{imageFile.name}</span>{" "}
              ({(imageFile.size / (1024 * 1024)).toFixed(1)} MB)
            </p>
          )}

          {imageError && <p className="mt-2 text-xs text-red-500">{imageError}</p>}
        </div>

        {/* Description */}
        <div className="mt-6">
          <label className="text-sm font-medium text-[#0A3161]">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            className="mt-1.5 w-full border border-[#C8D7E9] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30 resize-none"
            placeholder="Enter nutritional information and description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Alternate Food */}
        <div className="mt-6">
          <label className="text-sm font-medium text-[#0A3161]">
            Alternate Food <span className="text-xs font-normal text-[#5671A6]">(Optional)</span>
          </label>
          <Input
            className="mt-1.5 h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/30"
            placeholder="Enter alternate food item..."
            value={alternateFood}
            onChange={(e) => setAlternateFood(e.target.value)}
          />
        </div>

        {/* Footer buttons */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            onClick={() => router.push("/nutrition-macros")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full justify-center bg-[#0A3161] hover:bg-[#0D3D7A]"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Nutrition Item"}
          </Button>
        </div>
      </div>
    </div>
  );
}
