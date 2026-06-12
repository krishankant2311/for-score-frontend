"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HiOutlineArrowLeft, HiOutlineUpload } from "react-icons/hi";
import { LuApple } from "react-icons/lu";
import { fetchFoodById, updateFood, FOOD_CATEGORIES } from "@/lib/foodsApi";
import {
  sanitizeFoodNameInput,
  validateFoodName,
  isInRange,
  MACRO_LIMITS,
  normalizeNumberInput,
} from "@/lib/formValidation";

export default function EditFoodPage() {
  const { id } = useParams();
  const router = useRouter();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [category, setCategory] = useState("Protein");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const chip = (active) =>
    `rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
      active ? "border-[#0A3161] bg-[#0A3161]/5 text-[#0A3161]" : "border-[#C8D7E9] bg-white text-[#2158A3]"
    }`;

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const f = await fetchFoodById(id, { token });
        setName(f.name || "");
        setServingSize(f.servingSize || "");
        setCategory(f.category || "Other");
        setCalories(String(f.calories ?? ""));
        setProtein(String(f.protein ?? ""));
        setCarbs(String(f.carbs ?? ""));
        setFats(String(f.fats ?? ""));
        setImage(f.image || "");
      } catch (err) {
        toast.error(err?.message || "Failed to load food");
        router.push("/foods");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id, router]);

  const handleSave = async () => {
    if (isSaving) return;
    const caloriesTrimmed = String(calories ?? "").trim();
    if (!name.trim() || caloriesTrimmed === "") {
      toast.error("Name and calories are required", { id: "food-edit-required" });
      return;
    }
    if (Number.isNaN(Number(caloriesTrimmed)) || Number(caloriesTrimmed) < 0) {
      toast.error("Calories must be a valid number", { id: "food-edit-calories" });
      return;
    }
    if (!isInRange(caloriesTrimmed, MACRO_LIMITS.calories)) {
      toast.error(
        `Calories must be between ${MACRO_LIMITS.calories.min} and ${MACRO_LIMITS.calories.max}.`,
        { id: "food-edit-calories-range" }
      );
      return;
    }
    const nameError = validateFoodName(name);
    if (nameError) {
      toast.error(nameError, { id: "food-edit-name" });
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login again", { id: "food-edit-auth" });
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
      await updateFood(id, fd, { token });
      toast.success("Food updated");
      router.push("/foods");
    } catch (err) {
      toast.error(err?.adminPayload?.message || err?.message || "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">Loading Food…</div>;

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
            <h1 className="text-xl font-semibold text-[#0A3161]">Edit Food</h1>
            <p className="text-sm text-[#2158A3]">{name}</p>
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
            maxLength={100}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Serving size</label>
          <Input className="mt-1.5 h-12" value={servingSize} onChange={(e) => setServingSize(e.target.value)} />
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
        {image && !imageFile && (
          <img src={image} alt="" className="h-20 w-20 rounded-xl object-cover" />
        )}
        <div>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-6">
            <HiOutlineUpload /> {imageFile ? imageFile.name : "Change image"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.push("/foods")}>
            Cancel
          </Button>
          <Button className="bg-[#0A3161]" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Update"}
          </Button>
        </div>
      </div>
    </div>
  );
}
