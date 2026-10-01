import axios from "axios";
import { apiUrl } from "@/lib/apiBase";

function adminHeaders(token) {
  return { headers: { token } };
}

function throwFoodApiError(err, fallbackMessage) {
  if (err?.adminPayload) throw err;
  const data = err?.response?.data;
  if (data && typeof data === "object") {
    const apiErr = new Error(data.message || fallbackMessage);
    apiErr.adminPayload = data;
    throw apiErr;
  }
  throw err;
}

export const FOOD_CATEGORIES = ["Protein", "Carbs", "Vegetables", "Fruit", "Fats", "Other"];

export const FOOD_MEAL_TYPES = [
  "Breakfast",
  "Morning Snack",
  "Lunch",
  "Evening Snack",
  "Snack",
  "Dinner",
  "Other",
];

export async function fetchFoodCategories({ token } = {}) {
  try {
    const res = await axios.get(apiUrl("/api/admin/get-all-food-categories"), adminHeaders(token));
    if (res?.data?.success && Array.isArray(res.data.result)) {
      return res.data.result;
    }
    return [];
  } catch (err) {
    return [];
  }
}

export async function fetchAllFoods({
  token,
  search = "",
  category = "",
  page = 1,
  limit = 10,
} = {}) {
  const params = { page, limit };
  if (search?.trim()) params.search = search.trim();
  if (category && category !== "all") params.category = category;

  const res = await axios.get(apiUrl("/api/admin/get-all-foods"), {
    ...adminHeaders(token),
    params,
  });
  if (!res?.data?.success) {
    const err = new Error(res?.data?.message || "Failed to fetch foods");
    err.adminPayload = res?.data;
    throw err;
  }

  if (res.data.result && typeof res.data.result === "object" && Array.isArray(res.data.result.items)) {
    return res.data.result;
  }
  if (Array.isArray(res.data.result)) {
    const list = res.data.result;
    const categoryCounts = {};
    for (let i = 0; i < list.length; i++) {
      const cat = list[i]?.category || "Other";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    return {
      items: list,
      total: list.length,
      page: 1,
      limit: list.length,
      totalPages: 1,
      categoryCounts,
      allCount: list.length,
    };
  }
  return { items: [], total: 0, page: 1, limit, totalPages: 1, categoryCounts: {}, allCount: 0 };
}

export async function fetchFoodById(id, { token } = {}) {
  const res = await axios.get(apiUrl(`/api/admin/get-foods/${encodeURIComponent(id)}`), adminHeaders(token));
  if (!res?.data?.success) {
    const err = new Error(res?.data?.message || "Failed to fetch food");
    err.adminPayload = res?.data;
    throw err;
  }
  return res.data.result;
}

export async function createFood(formData, { token } = {}) {
  try {
    const res = await axios.post(apiUrl("/api/admin/add-foods"), formData, {
      ...adminHeaders(token),
      headers: { ...adminHeaders(token).headers, "Content-Type": "multipart/form-data" },
    });
    if (!res?.data?.success) {
      const err = new Error(res?.data?.message || "Failed to add food");
      err.adminPayload = res?.data;
      throw err;
    }
    return res.data.result;
  } catch (err) {
    throwFoodApiError(err, "Failed to add food");
  }
}

export async function updateFood(id, formData, { token } = {}) {
  try {
    const res = await axios.post(apiUrl(`/api/admin/update-foods/${encodeURIComponent(id)}`), formData, {
      ...adminHeaders(token),
      headers: { ...adminHeaders(token).headers, "Content-Type": "multipart/form-data" },
    });
    if (!res?.data?.success) {
      const err = new Error(res?.data?.message || "Failed to update food");
      err.adminPayload = res?.data;
      throw err;
    }
    return res.data.result;
  } catch (err) {
    throwFoodApiError(err, "Failed to update food");
  }
}

export async function deleteFoodById(id, { token } = {}) {
  try {
    const res = await axios.post(apiUrl(`/api/admin/delete-foods/${encodeURIComponent(id)}`), {}, adminHeaders(token));
    if (!res?.data?.success) {
      const err = new Error(res?.data?.message || "Failed to delete food");
      err.adminPayload = res?.data;
      throw err;
    }
    return res.data.result;
  } catch (err) {
    throwFoodApiError(err, "Failed to delete food");
  }
}
