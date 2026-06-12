"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiOutlineArrowLeft, HiOutlineUpload } from "react-icons/hi";
import { LuApple } from "react-icons/lu";
import { createFood, FOOD_CATEGORIES } from "@/lib/foodsApi";
import {
  sanitizeFoodNameInput,
  validateFoodName,
  isInRange,
  MACRO_LIMITS,
  normalizeNumberInput,
} from "@/lib/formValidation";

export default function NewFoodPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [name, setName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [category, setCategory] = useState("Protein");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const chip = (active) =>
    `rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
      active ? "border-[#0A3161] bg-[#0A3161]/5 text-[#0A3161]" : "border-[#C8D7E9] bg-white text-[#2158A3]"
    }`;

  const handleSave = async () => {
    if (isSaving) return;
    const caloriesTrimmed = String(calories ?? "").trim();
    if (!name.trim() || caloriesTrimmed === "") {
      toast.error("Name and calories are required", { id: "food-add-required" });
      return;
    }
    if (Number.isNaN(Number(caloriesTrimmed)) || Number(caloriesTrimmed) < 0) {
      toast.error("Calories must be a valid number", { id: "food-add-calories" });
      return;
    }
    if (!isInRange(caloriesTrimmed, MACRO_LIMITS.calories)) {
      toast.error(
        `Calories must be between ${MACRO_LIMITS.calories.min} and ${MACRO_LIMITS.calories.max}.`,
        { id: "food-add-calories-range" }
      );
      return;
    }
    const nameError = validateFoodName(name);
    if (nameError) {
      toast.error(nameError, { id: "food-add-name" });
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login again", { id: "food-add-auth" });
      return;
    }
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("servingSize", servingSize.trim());
    fd.append("category", category);
    fd.append("calories", caloriesTrimmed);
    fd.append("protein", protein || "0");
    fd.append("carbs", carbs || "0");
    fd.append("fats", fats || "0");
    if (imageFile) fd.append("image", imageFile);

    setIsSaving(true);
    try {
      await createFood(fd, { token });
      toast.success("Food added");
      router.push("/foods");
    } catch (err) {
      toast.error(err?.adminPayload?.message || err?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => router.back()} className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#C8D7E9] bg-white">
          <HiOutlineArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A3161] text-white">
            <LuApple className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A3161]">Add Food</h1>
            <p className="text-sm text-[#2158A3]">Shown in app food list with search & filters</p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5 rounded-2xl border border-[#C8D7E9] bg-white p-6 shadow-md">
        <div>
          <label className="text-sm font-medium text-[#0A3161]">Food name *</label>
          <Input
            className="mt-1.5 h-12"
            value={name}
            onChange={(e) => setName(sanitizeFoodNameInput(e.target.value))}
            placeholder="e.g. Grilled Chicken Breast"
            maxLength={100}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#0A3161]">Serving size</label>
          <Input className="mt-1.5 h-12" value={servingSize} onChange={(e) => setServingSize(e.target.value)} placeholder="e.g. 100g or 2 large eggs" />
        </div>
        <div>
          <label className="text-sm font-medium text-[#0A3161]">Category *</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {FOOD_CATEGORIES.map((c) => (
              <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)}>
                {c === "Fats" ? "Healthy Fats" : c}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Calories *", calories, setCalories, MACRO_LIMITS.calories],
            ["Protein (g)", protein, setProtein, MACRO_LIMITS.grams],
            ["Carbs (g)", carbs, setCarbs, MACRO_LIMITS.grams],
            ["Fat (g)", fats, setFats, MACRO_LIMITS.grams],
          ].map(([label, val, setVal, limits]) => (
            <div key={label}>
              <label className="text-sm font-medium text-[#0A3161]">{label}</label>
              <Input
                className="mt-1.5 h-12"
                value={val}
                min={limits.min}
                max={limits.max}
                onChange={(e) => setVal(normalizeNumberInput(e.target.value, limits))}
                inputMode="decimal"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="text-sm font-medium text-[#0A3161]">Image (optional)</label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#C8D7E9] py-8 text-[#2158A3] hover:bg-[#F2F5FA]"
          >
            <HiOutlineUpload /> {imageFile ? imageFile.name : "Upload image"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push("/foods")}>
            Cancel
          </Button>
          <Button className="bg-[#0A3161]" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Food"}
          </Button>
        </div>
      </div>
    </div>
  );
}
