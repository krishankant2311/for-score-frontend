"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — Nutrition & Macros replaced by Foods + Nutrition Cheat Sheet */
export default function NutritionMacrosRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/foods");
  }, [router]);
  return null;
}
