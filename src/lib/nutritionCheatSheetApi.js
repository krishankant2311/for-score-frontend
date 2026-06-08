import axios from "axios";
import { apiUrl } from "@/lib/apiBase";

function adminHeaders(token) {
  return { headers: { token } };
}

export const MACRO_TYPES = [
  { value: "protein", label: "Protein Sources" },
  { value: "carb", label: "Carb Sources" },
  { value: "fat", label: "Fat Sources" },
];

export async function fetchCheatSheetItems({
  token,
  search = "",
  macroType = "",
  page = 1,
  limit = 50,
} = {}) {
  const params = { page, limit, status: "active" };
  if (search?.trim()) params.search = search.trim();
  if (macroType && macroType !== "all") params.macroType = macroType;

  const res = await axios.get(apiUrl("/api/admin/nutrition-cheat-sheet"), {
    ...adminHeaders(token),
    params,
  });
  if (!res?.data?.success) {
    const err = new Error(res?.data?.message || "Failed to fetch cheat sheet");
    err.adminPayload = res?.data;
    throw err;
  }
  return res.data.result ?? { items: [], total: 0, page: 1, limit, totalPages: 1 };
}

export async function fetchAllCheatSheetItems({ token, search = "", macroType = "" } = {}) {
  const all = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await fetchCheatSheetItems({ token, search, macroType, page, limit: 100 });
    all.push(...(result.items ?? []));
    totalPages = result.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return all;
}

export async function fetchCheatSheetById(id, { token } = {}) {
  const res = await axios.get(apiUrl(`/api/admin/nutrition-cheat-sheet/${encodeURIComponent(id)}`), adminHeaders(token));
  if (!res?.data?.success) {
    const err = new Error(res?.data?.message || "Failed to fetch item");
    err.adminPayload = res?.data;
    throw err;
  }
  return res.data.result;
}

export async function createCheatSheetItem(body, { token } = {}) {
  const res = await axios.post(apiUrl("/api/admin/nutrition-cheat-sheet"), body, adminHeaders(token));
  if (!res?.data?.success) {
    const err = new Error(res?.data?.message || "Failed to add item");
    err.adminPayload = res?.data;
    throw err;
  }
  return res.data.result;
}

export async function updateCheatSheetItem(id, body, { token } = {}) {
  const res = await axios.post(apiUrl(`/api/admin/nutrition-cheat-sheet/${encodeURIComponent(id)}`), body, adminHeaders(token));
  if (!res?.data?.success) {
    const err = new Error(res?.data?.message || "Failed to update item");
    err.adminPayload = res?.data;
    throw err;
  }
  return res.data.result;
}

export async function deleteCheatSheetItem(id, { token } = {}) {
  const itemId = String(id ?? "").trim();
  if (!itemId) {
    const err = new Error("Invalid item id");
    throw err;
  }
  const res = await axios.post(
    apiUrl(`/api/admin/delete-nutrition-cheat-sheet/${encodeURIComponent(itemId)}`),
    {},
    adminHeaders(token)
  );
  if (!res?.data?.success) {
    const err = new Error(res?.data?.message || "Failed to delete item");
    err.adminPayload = res?.data;
    throw err;
  }
  return res.data.result;
}
