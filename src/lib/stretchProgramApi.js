import axios from "axios";
import { apiUrl } from "@/lib/apiBase";

function adminHeaders(token) {
  return {
    headers: {
      token,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 45000,
  };
}

function throwApiError(res, fallback) {
  const err = new Error(res?.data?.message || fallback);
  err.adminPayload = res?.data;
  throw err;
}

function wrapAxiosError(err, fallback) {
  if (err?.response?.data) {
    const wrapped = new Error(err.response.data.message || fallback);
    wrapped.adminPayload = err.response.data;
    throw wrapped;
  }
  throw err;
}
export async function fetchStretchPrograms({ token, search = "", status = "active", page = 1, limit = 50 } = {}) {
  const params = { page, limit, status };
  if (search?.trim()) params.search = search.trim();

  try {
    const res = await axios.get(apiUrl("/api/admin/stretch-programs"), {
      ...adminHeaders(token),
      params,
    });
    if (!res?.data?.success) throwApiError(res, "Failed to fetch stretch programs");
    return res.data.result ?? { items: [], total: 0, page: 1, limit, totalPages: 1 };
  } catch (err) {
    wrapAxiosError(err, "Failed to fetch stretch programs");
  }
}
export async function fetchAllStretchPrograms({ token, search = "", status = "all" } = {}) {
  const all = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await fetchStretchPrograms({ token, search, status, page, limit: 100 });
    all.push(...(result.items ?? []));
    totalPages = result.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return all;
}

export async function fetchStretchProgramById(id, { token } = {}) {
  try {
    const res = await axios.get(apiUrl(`/api/admin/stretch-programs/${encodeURIComponent(id)}`), adminHeaders(token));
    if (!res?.data?.success) throwApiError(res, "Failed to fetch stretch program");
    return res.data.result;
  } catch (err) {
    wrapAxiosError(err, "Failed to fetch stretch program");
  }
}

export async function createStretchProgram(body, { token } = {}) {
  try {
    const res = await axios.post(apiUrl("/api/admin/stretch-programs"), body, adminHeaders(token));
    if (!res?.data?.success) throwApiError(res, "Failed to add stretch program");
    return res.data.result;
  } catch (err) {
    wrapAxiosError(err, "Failed to add stretch program");
  }
}

export async function updateStretchProgram(id, body, { token } = {}) {
  try {
    const res = await axios.post(
      apiUrl(`/api/admin/stretch-programs/${encodeURIComponent(id)}`),
      body,
      adminHeaders(token)
    );
    if (!res?.data?.success) throwApiError(res, "Failed to update stretch program");
    return res.data.result;
  } catch (err) {
    wrapAxiosError(err, "Failed to update stretch program");
  }
}

export async function deleteStretchProgram(id, { token } = {}) {
  try {
    const res = await axios.post(
      apiUrl(`/api/admin/delete-stretch-programs/${encodeURIComponent(id)}`),
      {},
      adminHeaders(token)
    );
    if (!res?.data?.success) throwApiError(res, "Failed to delete stretch program");
    return res.data.result;
  } catch (err) {
    wrapAxiosError(err, "Failed to delete stretch program");
  }
}
export function buildStretchProgramPayload(form) {
  const movements = (form.movements ?? [])
    .map((m, idx) => ({
      sequenceOrder: Number(m.sequenceOrder) || idx + 1,
      sequenceLabel: String(m.sequenceLabel ?? "").trim(),
      movementName: String(m.movementName ?? "").trim(),
      targetArea: String(m.targetArea ?? "").trim(),
      timeLabel: String(m.timeLabel ?? "").trim(),
    }))
    .filter((m) => m.movementName);

  const intro = String(form.intro ?? "").trim();
  const description = String(form.description ?? "").trim();
  return {
    title: String(form.title ?? "").trim(),
    category: String(form.category ?? "Recover").trim() || "Recover",
    description: description || intro,
    intro,
    durationMinutes: Number(form.durationMinutes),
    level: form.level || "All Levels",
    status: form.status || "Active",
    sortOrder: form.sortOrder != null && form.sortOrder !== "" ? Number(form.sortOrder) : 0,
    movements,
  };
}
