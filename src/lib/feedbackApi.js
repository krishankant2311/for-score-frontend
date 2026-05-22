/**
 * Admin Feedback API — Bearer + token headers.
 * Primary routes (curl): get-all-feedback-byadmin, update-feedback-status-byadmin, delete-feedback-byadmin.
 */

import axios from "axios";
import { isAdminApiAuthError, isAdminApiErrorPayload } from "@/lib/fitnessProgramApi";

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

export function buildFeedbackAuthHeaders(token) {
  return { token, Authorization: `Bearer ${token}` };
}

function assertOkPayload(payload, fallbackMessage) {
  const data = payload ?? {};
  if (isAdminApiErrorPayload(data)) {
    const err = new Error(data.message || data.msg || fallbackMessage);
    err.adminPayload = data;
    if (isAdminApiAuthError(data)) err.isAuthError = true;
    throw err;
  }
  return data;
}

/** Display helper for badges */
export function normalizeFeedbackStatusForUi(backendStatus) {
  const raw = String(backendStatus ?? "").trim();
  const low = raw.toLowerCase();
  if (!raw) return { key: "new", label: "New", apiValue: "new" };
  if (
    ["resolved", "closed", "done", "completed"].includes(low) ||
    raw === "Resolved"
  ) {
    return { key: "resolved", label: "Resolved", apiValue: raw };
  }
  if (["inprogress", "in-progress", "progress"].includes(low.replace(/\s/g, ""))) {
    return { key: "inprogress", label: "In Progress", apiValue: "InProgress" };
  }
  if (low === "new" || low === "open" || low === "pending") {
    return { key: "new", label: raw === "Open" ? "Open" : "New", apiValue: low === "open" ? "Open" : "new" };
  }
  const label = raw.charAt(0).toUpperCase() + raw.slice(1);
  return { key: raw, label: label || "—", apiValue: raw };
}

export function mapFeedbackFromApi(raw) {
  if (!raw) return null;
  const id = raw._id ?? raw.id;
  if (id == null || id === "") return null;

  const backendStatus = raw.status ?? raw.feedbackStatus ?? raw.state ?? "new";
  const ui = normalizeFeedbackStatusForUi(backendStatus);

  return {
    id: String(id),
    userName: raw.userName ?? raw.name ?? raw.username ?? raw.user?.name ?? "—",
    userEmail: raw.userEmail ?? raw.email ?? raw.user?.email ?? "",
    rating: raw.rating ?? raw.stars ?? raw.score ?? "—",
    type: raw.type ?? raw.feedbackType ?? raw.category ?? "",
    message: raw.message ?? raw.feedback ?? raw.text ?? raw.comment ?? "",
    status: ui.label,
    statusKey: ui.key,
    /** Value to send back in update-feedback-status-byadmin body */
    statusApiValue: ui.apiValue,
    backendStatus: String(backendStatus ?? "").trim(),
    createdAt: formatDate(raw.createdAt ?? raw.created_at ?? raw.date ?? raw.submittedAt),
    _raw: raw,
  };
}

function mapFeedbackRows(rows) {
  return (Array.isArray(rows) ? rows : []).map(mapFeedbackFromApi).filter(Boolean);
}

export function extractFeedbackList(payload) {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.feedback)) return payload.feedback;
  if (Array.isArray(payload.feedbacks)) return payload.feedbacks;
  if (Array.isArray(payload.items)) return payload.items;
  const result = payload?.result ?? payload?.data ?? {};
  if (Array.isArray(result)) return result;
  const nested =
    result.feedback ??
    result.feedbacks ??
    result.items ??
    result.list ??
    result.rows ??
    (Array.isArray(result.data) ? result.data : null);
  if (Array.isArray(nested)) return nested;
  return [];
}

/**
 * GET /api/admin/get-all-feedback-byadmin
 * Query: optional type (e.g. Bug), status (e.g. new, InProgress — backend-controlled)
 */
export async function fetchAllFeedback({
  token,
  baseUrl,
  type,
  status,
} = {}) {
  if (!token || !baseUrl) throw new Error("Missing token or API base URL");
  const base = String(baseUrl).replace(/\/$/, "");
  const headers = buildFeedbackAuthHeaders(token);
  const params = {};
  if (type != null && String(type).trim() !== "") params.type = String(type).trim();
  if (status != null && String(status).trim() !== "") params.status = String(status).trim();

  const primaryPath = `/api/admin/get-all-feedback-byadmin`;

  /** @returns {Promise<ReturnType<typeof mapFeedbackFromApi>[]>} */
  async function tryFetch(url, method) {
    if (method === "get") {
      const res = await axios.get(url, { headers, params, timeout: 30000 });
      assertOkPayload(res?.data, "Failed to load feedback");
      return mapFeedbackRows(extractFeedbackList(res?.data ?? {}));
    }
    const fd = new FormData();
    fd.append("_", "");
    const res = await axios.post(url, fd, { headers, params, timeout: 30000 });
    assertOkPayload(res?.data, "Failed to load feedback");
    return mapFeedbackRows(extractFeedbackList(res?.data ?? {}));
  }

  const urls = [`${base}${primaryPath}`, `${base.replace(/\/api$/i, "")}${primaryPath}`];

  for (const url of urls) {
    try {
      const rows = await tryFetch(url, "get");
      return rows;
    } catch (e) {
      if (e?.isAuthError) throw e;
      const st = e?.response?.status;
      if (st !== 404 && st !== 405) {
        /** try POST fallback below */
      }
    }
    try {
      const fd = new FormData();
      fd.append("_", "");
      Object.entries(params).forEach(([k, v]) => fd.append(k, String(v)));
      const res = await axios.post(url, fd, {
        headers,
        timeout: 30000,
      });
      assertOkPayload(res?.data, "Failed to load feedback");
      return mapFeedbackRows(extractFeedbackList(res?.data ?? {}));
    } catch {
      /* next url */
    }
  }

  const legacyPaths = [`/api/admin/get-all-feedback`];
  const legacyUrls = legacyPaths.flatMap((p) => [`${base}${p}`, `${base.replace(/\/api$/i, "")}${p}`]);
  const lastErr = [];
  for (const url of legacyUrls) {
    try {
      return await tryFetch(url, "get");
    } catch (e1) {
      lastErr.push(e1);
      if (e1?.response?.status === 405 || e1?.response?.status === 404) {
        try {
          const fd = new FormData();
          fd.append("_", "");
          Object.entries(params).forEach(([k, v]) => fd.append(k, String(v)));
          const res = await axios.post(url, fd, { headers, timeout: 30000 });
          assertOkPayload(res?.data, "Failed to load feedback");
          return mapFeedbackRows(extractFeedbackList(res?.data ?? {}));
        } catch (e2) {
          lastErr.push(e2);
        }
      }
    }
  }
  throw lastErr[lastErr.length - 1] ?? new Error("Failed to load feedback");
}

function postEncodedStatus(url, status, headers) {
  const body = new URLSearchParams();
  body.append("status", status);
  return axios.post(url, body, {
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 30000,
  });
}

/**
 * POST /api/admin/update-feedback-status-byadmin/:id — body urlencoded status=InProgress | new | Resolved …
 */
export async function updateFeedbackStatusByAdmin(id, status, { token, baseUrl }) {
  if (!id || !token || !baseUrl) throw new Error("Missing id, token, or API base URL");
  const base = String(baseUrl).replace(/\/$/, "");
  const encId = encodeURIComponent(id);
  const headers = buildFeedbackAuthHeaders(token);
  const statusStr = String(status ?? "").trim();
  if (!statusStr) throw new Error("Missing status");

  const tries = [
    `${base}/api/admin/update-feedback-status-byadmin/${encId}`,
    `${base.replace(/\/api$/i, "")}/api/admin/update-feedback-status-byadmin/${encId}`,
    `${base}/api/admin/update-feedback/${encId}`,
  ];

  let lastErr;
  for (const url of tries) {
    try {
      const res = await postEncodedStatus(url, statusStr, headers);
      assertOkPayload(res?.data, "Failed to update feedback status");
      return res;
    } catch (e) {
      lastErr = e;
      if (e?.isAuthError) throw e;
    }
    try {
      const fd = new FormData();
      fd.append("status", statusStr);
      const res = await axios.post(url, fd, { headers, timeout: 30000 });
      assertOkPayload(res?.data, "Failed to update feedback status");
      return res;
    } catch (e2) {
      lastErr = e2;
    }
  }
  throw lastErr ?? new Error("Failed to update feedback status");
}

/**
 * POST /api/admin/delete-feedback-byadmin/:id
 */
export async function deleteFeedbackById(id, { token, baseUrl }) {
  if (!id || !token || !baseUrl) throw new Error("Missing id, token, or API base URL");
  const base = String(baseUrl).replace(/\/$/, "");
  const encId = encodeURIComponent(id);
  const headers = buildFeedbackAuthHeaders(token);

  const paths = [
    `/api/admin/delete-feedback-byadmin/${encId}`,
    `/api/admin/delete-feedback/${encId}`,
  ];

  let lastErr;
  for (const p of paths) {
    const urls = [`${base}${p}`, `${base.replace(/\/api$/i, "")}${p}`];
    for (const url of urls) {
      try {
        const res = await axios.post(url, new URLSearchParams({ _: "" }), {
          headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 30000,
        });
        assertOkPayload(res?.data, "Failed to delete feedback");
        return res;
      } catch {
        /* continue */
      }
      try {
        const fd = new FormData();
        fd.append("_", "");
        const res = await axios.post(url, fd, { headers, timeout: 30000 });
        assertOkPayload(res?.data, "Failed to delete feedback");
        return res;
      } catch (e2) {
        lastErr = e2;
      }
      try {
        const res = await axios.post(url, {}, { headers, timeout: 30000 });
        assertOkPayload(res?.data, "Failed to delete feedback");
        return res;
      } catch (e3) {
        lastErr = e3;
      }
    }
  }
  throw lastErr ?? new Error("Failed to delete feedback");
}

/** @deprecated use updateFeedbackStatusByAdmin — kept for any old imports */
export async function setFeedbackResolved(id, resolved, { token, baseUrl }) {
  const status = resolved ? "Resolved" : "new";
  return updateFeedbackStatusByAdmin(id, status, { token, baseUrl });
}
