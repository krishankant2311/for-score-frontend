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

export async function fetchAllFoods({ token, search = "", category = "" } = {}) {
  const params = {};
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
  return Array.isArray(res.data.result) ? res.data.result : [];
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
