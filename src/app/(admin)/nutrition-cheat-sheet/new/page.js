"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { TbChartPie } from "react-icons/tb";
import { createCheatSheetItem, MACRO_TYPES } from "@/lib/nutritionCheatSheetApi";
import { isInRange, MACRO_LIMITS, normalizeNumberInput } from "@/lib/formValidation";

export default function NewCheatSheetPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [macroType, setMacroType] = useState("protein");
  const [macroAmountGrams, setMacroAmountGrams] = useState("");
  const [calories, setCalories] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isSaving, setIsSaving] = useState(false);

  const chip = (active) =>
    `w-full rounded-xl border px-3 py-2.5 text-sm font-medium ${
      active ? "border-[#0A3161] bg-[#0A3161]/5 text-[#0A3161]" : "border-[#C8D7E9] bg-white"
    }`;

  const handleSave = async () => {
    if (isSaving) return;
    if (!name.trim() || !servingSize.trim() || macroAmountGrams === "" || calories === "") {
      toast.error("Fill all required fields", { id: "cheat-sheet-add-required" });
      return;
    }
    if (!isInRange(macroAmountGrams, MACRO_LIMITS.grams)) {
      toast.error(
        `Macro amount must be between ${MACRO_LIMITS.grams.min} and ${MACRO_LIMITS.grams.max}g.`,
        { id: "cheat-sheet-add-macro-range" }
      );
      return;
    }
    if (!isInRange(calories, MACRO_LIMITS.calories)) {
      toast.error(
        `Calories must be between ${MACRO_LIMITS.calories.min} and ${MACRO_LIMITS.calories.max}.`,
        { id: "cheat-sheet-add-cal-range" }
      );
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login again", { id: "cheat-sheet-add-auth" });
      return;
    }
    setIsSaving(true);
    try {
      await createCheatSheetItem(
        {
          name: name.trim(),
          servingSize: servingSize.trim(),
          macroType,
          macroAmountGrams,
          calories,
          sortOrder,
        },
        { token }
      );
      toast.success("Item added");
      router.push("/nutrition-cheat-sheet");
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => router.back()} className="flex h-12 w-12 items-center justify-center rounded-lg border bg-white">
          <HiOutlineArrowLeft />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A3161] text-white">
            <TbChartPie className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A3161]">Add Cheat Sheet Item</h1>
            <p className="text-sm text-[#2158A3]">Appears under Protein / Carb / Fat in the app</p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5 rounded-2xl border border-[#C8D7E9] bg-white p-6 shadow-md">
        <div>
          <label className="text-sm font-medium">Section *</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {MACRO_TYPES.map((m) => (
              <button key={m.value} type="button" className={chip(macroType === m.value)} onClick={() => setMacroType(m.value)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Food name *</label>
          <Textarea
            className="mt-1.5 min-h-12 resize-y break-words rounded-xl border-[#C8D7E9] px-4 py-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chicken Breast"
            rows={2}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Serving size *</label>
          <Textarea
            className="mt-1.5 min-h-12 resize-y break-words rounded-xl border-[#C8D7E9] px-4 py-3"
            value={servingSize}
            onChange={(e) => setServingSize(e.target.value)}
            placeholder="100g"
            rows={2}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Macro amount (g) *</label>
            <Input
              className="mt-1.5 h-12"
              value={macroAmountGrams}
              min={MACRO_LIMITS.grams.min}
              max={MACRO_LIMITS.grams.max}
              inputMode="numeric"
              onChange={(e) => setMacroAmountGrams(normalizeNumberInput(e.target.value, MACRO_LIMITS.grams))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Calories *</label>
            <Input
              className="mt-1.5 h-12"
              value={calories}
              min={MACRO_LIMITS.calories.min}
              max={MACRO_LIMITS.calories.max}
              inputMode="numeric"
              onChange={(e) => setCalories(normalizeNumberInput(e.target.value, MACRO_LIMITS.calories))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Sort order</label>
            <Input className="mt-1.5 h-12" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/[^\d]/g, ""))} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.push("/nutrition-cheat-sheet")}>
            Cancel
          </Button>
          <Button className="bg-[#0A3161]" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
