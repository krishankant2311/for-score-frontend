"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HiOutlineArrowLeft,
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineX,
} from "react-icons/hi";
import { LuApple, LuScale, LuLayers, LuFlame } from "react-icons/lu";
import { createFood, fetchFoodCategories, FOOD_MEAL_TYPES } from "@/lib/foodsApi";
import {
  sanitizeFoodNameInput,
  validateFoodName,
  isInRange,
  MACRO_LIMITS,
  normalizeNumberInput,
  normalizeDecimalInput,
} from "@/lib/formValidation";

export default function NewFoodPage() {
  const router = useRouter();
  const fileRef = useRef(null);

  // 1. Basic Info
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Other");
  const [categoriesList, setCategoriesList] = useState([]);
  const [mealType, setMealType] = useState("Other");
  const [upc, setUpc] = useState("");

  // 2. Serving Info
  const [servingSize, setServingSize] = useState("");
  const [servingGrams, setServingGrams] = useState("");

  // 3. Macros (Per Serving)
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");

  // 4. Micronutrients
  const [fiber, setFiber] = useState("");
  const [sugar, setSugar] = useState("");
  const [sodium, setSodium] = useState("");

  // 5. Per 100g Macros
  const [calories100, setCalories100] = useState("");
  const [protein100, setProtein100] = useState("");
  const [carbs100, setCarbs100] = useState("");
  const [fat100, setFat100] = useState("");

  // 6. Additional Serving Sizes
  const [servingSizes, setServingSizes] = useState([]);

  // 7. Image
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const chip = (active) =>
    `rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
      active
        ? "border-[#0A3161] bg-[#0A3161] text-white shadow-sm"
        : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
    }`;

  useEffect(() => {
    const loadCategories = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      const cats = await fetchFoodCategories({ token });
      if (Array.isArray(cats) && cats.length > 0) setCategoriesList(cats);
    };
    loadCategories();
  }, []);

  const handleImageChange = (file) => {
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  // Auto-calculate 100g macros from serving grams
  const handleAutoCalc100g = () => {
    const grams = parseFloat(servingGrams);
    if (!grams || grams <= 0) {
      toast.error("Please enter a valid Serving Weight in Grams first.");
      return;
    }
    const cal = parseFloat(calories) || 0;
    const pro = parseFloat(protein) || 0;
    const carb = parseFloat(carbs) || 0;
    const fat = parseFloat(fats) || 0;

    setCalories100(String(Math.round((cal / grams) * 100)));
    setProtein100(String(Math.round((pro / grams) * 100 * 100) / 100));
    setCarbs100(String(Math.round((carb / grams) * 100 * 100) / 100));
    setFat100(String(Math.round((fat / grams) * 100 * 100) / 100));
    toast.success("Per 100g values auto-calculated from serving weight!");
  };

  // Additional serving size row handlers
  const handleAddServingSize = () => {
    setServingSizes((prev) => [
      ...prev,
      {
        servingDescription: "",
        servingGrams: "",
        calories: "",
        protein: "",
        carbs: "",
        fats: "",
      },
    ]);
  };

  const handleUpdateServingSize = (index, field, value) => {
    setServingSizes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveServingSize = (index) => {
    setServingSizes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (isSaving) return;

    const caloriesTrimmed = String(calories ?? "").trim();
    if (!name.trim() || caloriesTrimmed === "") {
      toast.error("Food name and calories are required", { id: "food-add-required" });
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
    if (brand.trim()) fd.append("brand", brand.trim());
    fd.append("category", category);
    fd.append("mealType", mealType);
    if (servingSize.trim()) fd.append("servingSize", servingSize.trim());
    if (servingGrams.trim()) fd.append("servingGrams", servingGrams.trim());
    if (upc.trim()) fd.append("upc", upc.trim());

    // Macros (Per serving)
    fd.append("calories", caloriesTrimmed);
    fd.append("protein", protein || "0");
    fd.append("carbs", carbs || "0");
    fd.append("fats", fats || "0");

    fd.append("calories_per_serving", caloriesTrimmed);
    fd.append("protein_g_per_serving", protein || "0");
    fd.append("carbs_g_per_serving", carbs || "0");
    fd.append("fat_g_per_serving", fats || "0");

    // Per 100g
    if (calories100.trim()) fd.append("calories_per_100g", calories100.trim());
    if (protein100.trim()) fd.append("protein_g_per_100g", protein100.trim());
    if (carbs100.trim()) fd.append("carbs_g_per_100g", carbs100.trim());
    if (fat100.trim()) fd.append("fat_g_per_100g", fat100.trim());

    // Micronutrients
    if (fiber.trim()) fd.append("fiber", fiber.trim());
    if (sugar.trim()) fd.append("sugar", sugar.trim());
    if (sodium.trim()) fd.append("sodium", sodium.trim());

    // Extra serving sizes
    const validServingSizes = servingSizes
      .filter((s) => s.servingDescription.trim() || Number(s.servingGrams) > 0)
      .map((s) => ({
        servingDescription: s.servingDescription.trim(),
        servingGrams: Number(s.servingGrams || 0),
        calories: Math.round(Number(s.calories || 0)),
        protein: Number(s.protein || 0),
        carbs: Number(s.carbs || 0),
        fats: Number(s.fats || 0),
      }));

    if (validServingSizes.length > 0) {
      fd.append("servingSizes", JSON.stringify(validServingSizes));
    }

    if (imageFile) fd.append("image", imageFile);

    setIsSaving(true);
    try {
      await createFood(fd, { token });
      toast.success("Food added successfully", { id: "food-add-success" });
      router.push("/foods");
    } catch (err) {
      toast.error(err?.adminPayload?.message || err?.message || "Failed to save food");
    } finally {
      setIsSaving(false);
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
            <LuApple className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A3161]">Add Food</h1>
            <p className="text-sm text-[#2158A3]">
              Add a new food item to the catalog with full serving and macro details
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Section 1: Basic Information */}
        <div className="rounded-2xl border border-[#C8D7E9] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#0A3161] flex items-center gap-2 border-b border-[#E3ECF8] pb-3">
            <LuApple className="h-4 w-4 text-[#2158A3]" /> Basic Information
          </h2>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#0A3161]">
                Food Name <span className="text-red-500">*</span>
              </label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={name}
                onChange={(e) => setName(sanitizeFoodNameInput(e.target.value))}
                placeholder="e.g. Grilled Chicken Breast"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0A3161]">
                Brand <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Tyson, Kirkland, Quaker"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0A3161]">
                Barcode / UPC <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={upc}
                onChange={(e) => setUpc(e.target.value.replace(/[^\w\d-]/g, ""))}
                placeholder="e.g. 012345678905"
                maxLength={50}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0A3161]">
                Meal Type
              </label>
              <select
                className="mt-1.5 h-12 w-full rounded-xl border border-[#C8D7E9] bg-white px-3 text-sm text-[#0A3161] outline-none focus:ring-2 focus:ring-[#0A3161]/20"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
              >
                {FOOD_MEAL_TYPES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium text-[#0A3161]">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5 space-y-2">
              <Input
                list="category-new-options"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Enter or select category (e.g. Snack, Energy & Granola Bars)..."
                className="h-12 rounded-xl border-[#C8D7E9]"
              />
              <datalist id="category-new-options">
                {categoriesList.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {categoriesList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground mr-1">Suggestions:</span>
                  {categoriesList.slice(0, 8).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                        category === c
                          ? "border-[#0A3161] bg-[#0A3161] text-white"
                          : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
                      }`}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Serving Information */}
        <div className="rounded-2xl border border-[#C8D7E9] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#0A3161] flex items-center gap-2 border-b border-[#E3ECF8] pb-3">
            <LuScale className="h-4 w-4 text-[#2158A3]" /> Serving Size & Weight
          </h2>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#0A3161]">
                Serving Size Description
              </label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                placeholder="e.g. 1 breast (172g) or 1 cup or 100g"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0A3161]">
                Serving Weight in Grams (g)
              </label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={servingGrams}
                onChange={(e) =>
                  setServingGrams(
                    normalizeDecimalInput(e.target.value, MACRO_LIMITS.servingGrams)
                  )
                }
                placeholder="e.g. 100 or 172"
                inputMode="decimal"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Macronutrients (Per Serving) */}
        <div className="rounded-2xl border border-[#C8D7E9] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#0A3161] flex items-center gap-2 border-b border-[#E3ECF8] pb-3">
            <LuFlame className="h-4 w-4 text-[#2158A3]" /> Macronutrients (Per Serving)
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-[#0A3161]">
                Calories (kcal) <span className="text-red-500">*</span>
              </label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={calories}
                min={MACRO_LIMITS.calories.min}
                max={MACRO_LIMITS.calories.max}
                onChange={(e) =>
                  setCalories(normalizeNumberInput(e.target.value, MACRO_LIMITS.calories))
                }
                placeholder="0"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0A3161]">Protein (g)</label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={protein}
                min={MACRO_LIMITS.grams.min}
                max={MACRO_LIMITS.grams.max}
                onChange={(e) =>
                  setProtein(normalizeDecimalInput(e.target.value, MACRO_LIMITS.grams))
                }
                placeholder="0"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0A3161]">Carbs (g)</label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={carbs}
                min={MACRO_LIMITS.grams.min}
                max={MACRO_LIMITS.grams.max}
                onChange={(e) =>
                  setCarbs(normalizeDecimalInput(e.target.value, MACRO_LIMITS.grams))
                }
                placeholder="0"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0A3161]">Fat (g)</label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={fats}
                min={MACRO_LIMITS.grams.min}
                max={MACRO_LIMITS.grams.max}
                onChange={(e) =>
                  setFats(normalizeDecimalInput(e.target.value, MACRO_LIMITS.grams))
                }
                placeholder="0"
                inputMode="decimal"
              />
            </div>
          </div>

          {/* Secondary nutrients: Fiber, Sugar, Sodium */}
          <div className="mt-5 border-t border-[#E3ECF8] pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2158A3] mb-3">
              Secondary Nutrients (Optional)
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-[#0A3161]">Fiber (g)</label>
                <Input
                  className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                  value={fiber}
                  onChange={(e) =>
                    setFiber(normalizeDecimalInput(e.target.value, MACRO_LIMITS.grams))
                  }
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#0A3161]">Sugar (g)</label>
                <Input
                  className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                  value={sugar}
                  onChange={(e) =>
                    setSugar(normalizeDecimalInput(e.target.value, MACRO_LIMITS.grams))
                  }
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#0A3161]">Sodium (mg)</label>
                <Input
                  className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                  value={sodium}
                  onChange={(e) =>
                    setSodium(normalizeDecimalInput(e.target.value, MACRO_LIMITS.sodium))
                  }
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Per 100g Values */}
        <div className="rounded-2xl border border-[#C8D7E9] bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E3ECF8] pb-3">
            <div>
              <h2 className="text-base font-semibold text-[#0A3161] flex items-center gap-2">
                <LuLayers className="h-4 w-4 text-[#2158A3]" /> Nutrition per 100g
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standard 100g values used by food logging calculators
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoCalc100g}
              className="text-[#0A3161] border-[#C8D7E9] hover:bg-[#F2F5FA] flex items-center gap-1.5 self-start sm:self-auto"
            >
              <HiOutlineSparkles className="h-4 w-4 text-amber-500" />
              Auto-calculate from Serving Weight
            </Button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-[#0A3161]">Calories / 100g</label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={calories100}
                onChange={(e) =>
                  setCalories100(
                    normalizeNumberInput(e.target.value, MACRO_LIMITS.calories)
                  )
                }
                placeholder="0"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0A3161]">Protein / 100g (g)</label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={protein100}
                onChange={(e) =>
                  setProtein100(
                    normalizeDecimalInput(e.target.value, MACRO_LIMITS.grams)
                  )
                }
                placeholder="0"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0A3161]">Carbs / 100g (g)</label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={carbs100}
                onChange={(e) =>
                  setCarbs100(
                    normalizeDecimalInput(e.target.value, MACRO_LIMITS.grams)
                  )
                }
                placeholder="0"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0A3161]">Fat / 100g (g)</label>
              <Input
                className="mt-1.5 h-12 rounded-xl border-[#C8D7E9]"
                value={fat100}
                onChange={(e) =>
                  setFat100(
                    normalizeDecimalInput(e.target.value, MACRO_LIMITS.grams)
                  )
                }
                placeholder="0"
                inputMode="decimal"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Additional Serving Sizes */}
        <div className="rounded-2xl border border-[#C8D7E9] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E3ECF8] pb-3">
            <div>
              <h2 className="text-base font-semibold text-[#0A3161] flex items-center gap-2">
                <LuScale className="h-4 w-4 text-[#2158A3]" /> Additional Serving Sizes
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Optional alternative portions (e.g. 1 slice, 1 scoop, 1 cup)
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddServingSize}
              className="text-[#0A3161] border-[#C8D7E9] hover:bg-[#F2F5FA] flex items-center gap-1.5"
            >
              <HiOutlinePlus className="h-4 w-4" /> Add Serving Option
            </Button>
          </div>

          {servingSizes.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No additional serving sizes added. Click &quot;Add Serving Option&quot; above if this food has alternative portions.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {servingSizes.map((row, idx) => (
                <div
                  key={idx}
                  className="relative grid grid-cols-2 gap-3 rounded-xl border border-[#C8D7E9] bg-[#F8FAFC] p-4 sm:grid-cols-6 items-end"
                >
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-[#0A3161]">
                      Description
                    </label>
                    <Input
                      className="mt-1 h-10 rounded-lg bg-white text-xs border-[#C8D7E9]"
                      placeholder="e.g. 1 slice"
                      value={row.servingDescription}
                      onChange={(e) =>
                        handleUpdateServingSize(idx, "servingDescription", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#0A3161]">Grams (g)</label>
                    <Input
                      className="mt-1 h-10 rounded-lg bg-white text-xs border-[#C8D7E9]"
                      placeholder="30"
                      value={row.servingGrams}
                      onChange={(e) =>
                        handleUpdateServingSize(idx, "servingGrams", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#0A3161]">Calories</label>
                    <Input
                      className="mt-1 h-10 rounded-lg bg-white text-xs border-[#C8D7E9]"
                      placeholder="80"
                      value={row.calories}
                      onChange={(e) =>
                        handleUpdateServingSize(idx, "calories", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#0A3161]">P / C / F (g)</label>
                    <div className="flex gap-1">
                      <Input
                        className="mt-1 h-10 w-full rounded-lg bg-white text-xs px-1 text-center border-[#C8D7E9]"
                        placeholder="P"
                        title="Protein (g)"
                        value={row.protein}
                        onChange={(e) =>
                          handleUpdateServingSize(idx, "protein", e.target.value)
                        }
                      />
                      <Input
                        className="mt-1 h-10 w-full rounded-lg bg-white text-xs px-1 text-center border-[#C8D7E9]"
                        placeholder="C"
                        title="Carbs (g)"
                        value={row.carbs}
                        onChange={(e) =>
                          handleUpdateServingSize(idx, "carbs", e.target.value)
                        }
                      />
                      <Input
                        className="mt-1 h-10 w-full rounded-lg bg-white text-xs px-1 text-center border-[#C8D7E9]"
                        placeholder="F"
                        title="Fat (g)"
                        value={row.fats}
                        onChange={(e) =>
                          handleUpdateServingSize(idx, "fats", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveServingSize(idx)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Remove serving size"
                      title="Remove"
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 6: Image Upload */}
        <div className="rounded-2xl border border-[#C8D7E9] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#0A3161] flex items-center gap-2 border-b border-[#E3ECF8] pb-3">
            <HiOutlineUpload className="h-4 w-4 text-[#2158A3]" /> Food Image (Optional)
          </h2>

          <div className="mt-4">
            {imagePreview ? (
              <div className="flex items-center gap-4">
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="h-24 w-24 rounded-2xl object-cover border border-[#C8D7E9] shadow-sm"
                />
                <div>
                  <p className="text-sm font-medium text-[#0A3161]">
                    {imageFile?.name || "Selected image"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : ""}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="mt-2 text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5 h-8"
                  >
                    <HiOutlineX className="h-3.5 w-3.5" /> Remove Image
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#C8D7E9] bg-[#F8FAFC] py-8 text-[#2158A3] hover:border-[#0A3161] hover:bg-[#F2F5FA] transition-all cursor-pointer"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm border border-[#C8D7E9] text-[#0A3161]">
                  <HiOutlineUpload className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[#0A3161]">
                    Click to upload food photo
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Supports JPG, PNG, WEBP up to 5MB
                  </p>
                </div>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageChange(e.target.files?.[0])}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/foods")}
            disabled={isSaving}
            className="h-12 px-6 rounded-xl border-[#C8D7E9]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-12 px-8 rounded-xl bg-[#0A3161] hover:bg-[#0A3161]/90 shadow-md text-white font-medium"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving Food…" : "Save Food"}
          </Button>
        </div>
      </div>
    </div>
  );
}
