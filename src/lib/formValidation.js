export const FOOD_NAME_PATTERN = /^[a-zA-Z0-9\s\-'.,()&]+$/;
export const FOOD_NAME_MAX = 100;

export function sanitizeFoodNameInput(value) {
  return String(value ?? "").replace(/[^a-zA-Z0-9\s\-'.,()&]/g, "");
}

export function validateFoodName(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "Food name is required";
  if (trimmed.length > FOOD_NAME_MAX) return `Food name must be ${FOOD_NAME_MAX} characters or fewer`;
  if (!FOOD_NAME_PATTERN.test(trimmed)) {
    return "Food name can only contain letters, numbers, spaces, and - ' . , ( ) &";
  }
  return null;
}

export const MACRO_LIMITS = {
  calories: { min: 0, max: 9999, label: "Calories" },
  grams: { min: 0, max: 999, label: "grams" },
};

export function normalizeNumberInput(raw, { min, max }) {
  const s = String(raw ?? "");
  if (s === "") return "";
  const digits = s.replace(/[^\d]/g, "");
  if (digits === "") return "";
  const n = Number(digits);
  if (Number.isNaN(n)) return "";
  return String(Math.min(max, Math.max(min, n)));
}

export function isInRange(value, { min, max }) {
  if (value === "" || value == null) return false;
  const n = Number(value);
  return !Number.isNaN(n) && n >= min && n <= max;
}

export function buildPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
  if (currentPage >= totalPages - 3) {
    return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "…", currentPage - 1, currentPage, currentPage + 1, "…", totalPages];
}
