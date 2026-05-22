/**
 * Admin FAQ API — multipart FormData + token (matches Express upload.none() routes).
 */

import axios from "axios";
import { isAdminApiErrorPayload, isAdminApiAuthError } from "@/lib/fitnessProgramApi";

export function buildFaqAuthHeaders(token) {
  return { token, Authorization: `Bearer ${token}` };
}

function formatDate(d) {
  if (d == null || d === "") return "—";
  try {
    const t = new Date(d).getTime();
    if (Number.isNaN(t)) return String(d);
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return String(d);
  }
}

/** Map API document → list row */
export function mapFaqFromApi(raw) {
  if (!raw) return null;
  const id = raw._id ?? raw.id;
  if (id == null || id === "") return null;
  const st = raw.status;
  const inactive = st === "Inactive" || st === "inactive" || st === false || st === 0;
  return {
    id: String(id),
    question: raw.question ?? raw.title ?? "",
    category: raw.category ?? "",
    status: inactive ? "Inactive" : "Active",
    answer: raw.answer ?? raw.description ?? raw.content ?? "",
    createdAt: formatDate(raw.createdAt ?? raw.created_at ?? raw.date),
    _raw: raw,
  };
}

export function extractFaqsFromListResponse(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.faqs)) return data.faqs;
  const result = data?.result ?? data?.data ?? {};
  if (Array.isArray(result)) return result;
  const raw =
    result.faqs ??
    result.data ??
    result.items ??
    result.list ??
    (Array.isArray(result.rows) ? result.rows : null);
  if (Array.isArray(raw)) return raw;
  return [];
}

export function appendFaqFields(formData, { question, category, status, answer }) {
  formData.append("question", question != null ? String(question) : "");
  formData.append("category", category != null ? String(category) : "");
  formData.append("status", status != null ? String(status) : "Active");
  formData.append("answer", answer != null ? String(answer) : "");
}

function assertOkResponse(res, fallbackMessage) {
  const data = res?.data ?? {};
  if (isAdminApiErrorPayload(data)) {
    const err = new Error(data.message || data.msg || fallbackMessage);
    err.adminPayload = data;
    if (isAdminApiAuthError(data)) err.isAuthError = true;
    throw err;
  }
  return res;
}

export async function fetchAllFaqs({ token, baseUrl }) {
  if (!token || !baseUrl) throw new Error("Missing token or API base URL");
  const base = String(baseUrl).replace(/\/$/, "");
  const headers = buildFaqAuthHeaders(token);

  let res;
  try {
    res = await axios.get(`${base}/api/admin/get-all-faq`, { headers, timeout: 30000 });
  } catch (e) {
    if (e?.response?.status === 405 || e?.response?.status === 404) {
      const fd = new FormData();
      fd.append("_", "");
      res = await axios.post(`${base}/api/admin/get-all-faq`, fd, { headers, timeout: 30000 });
    } else {
      throw e;
    }
  }

  const payload = res?.data ?? {};
  if (isAdminApiErrorPayload(payload)) {
    const err = new Error(payload.message || "Failed to load FAQs");
    err.adminPayload = payload;
    throw err;
  }
  const rawList = extractFaqsFromListResponse(payload);
  return rawList.map(mapFaqFromApi).filter(Boolean);
}

export async function fetchFaqById(id, { token, baseUrl }) {
  const list = await fetchAllFaqs({ token, baseUrl });
  return list.find((f) => String(f.id) === String(id)) ?? null;
}

export async function createFaq(payload, { token, baseUrl }) {
  if (!token || !baseUrl) throw new Error("Missing token or API base URL");
  const base = String(baseUrl).replace(/\/$/, "");
  const fd = new FormData();
  appendFaqFields(fd, payload);
  const res = await axios.post(`${base}/api/admin/add-faq`, fd, {
    headers: buildFaqAuthHeaders(token),
    timeout: 30000,
  });
  console.log("createFaq res", res);
  return assertOkResponse(res, "Failed to create FAQ");
}

export async function updateFaq(id, payload, { token, baseUrl }) {
  if (!id || !token || !baseUrl) throw new Error("Missing id, token, or API base URL");
  const base = String(baseUrl).replace(/\/$/, "");
  const fd = new FormData();
  appendFaqFields(fd, payload);
  const res = await axios.post(`${base}/api/admin/update-faq/${encodeURIComponent(id)}`, fd, {
    headers: buildFaqAuthHeaders(token),
    timeout: 30000,
  });
  return assertOkResponse(res, "Failed to update FAQ");
}

export async function deleteFaqById(id, { token, baseUrl }) {
  if (!id || !token || !baseUrl) throw new Error("Missing id, token, or API base URL");
  const base = String(baseUrl).replace(/\/$/, "");
  const fd = new FormData();
  fd.append("_", "");
  const res = await axios.post(`${base}/api/admin/delete-faq/${encodeURIComponent(id)}`, fd, {
    headers: buildFaqAuthHeaders(token),
    timeout: 30000,
  });
  return assertOkResponse(res, "Failed to delete FAQ");
}
