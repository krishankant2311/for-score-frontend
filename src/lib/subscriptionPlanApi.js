/**
 * Admin subscription plans — API routes: get-all-plans, add-plan, update-plan/:id, delete-plan/:id
 * Tries multiple body shapes (JSON, multipart, urlencoded) because backends differ.
 */

import axios from "axios";
import { isAdminApiAuthError, isAdminApiErrorPayload } from "@/lib/fitnessProgramApi";
import { buildFaqAuthHeaders } from "@/lib/faqApi";

const DEFAULT_ACCESS = { fitnessPrograms: true };
const DEFAULT_ACCESS_ITEMS = { fitnessPrograms: { mode: "all", ids: [] } };
const DEFAULT_PERIOD = 30;

/**
 * If NEXT_PUBLIC_API_BASE_URL is `https://host/api`, use `https://host/api/admin/...`
 * and NOT `https://host/api/api/admin/...`.
 */
export function joinAdminPath(baseUrl, pathAfterAdmin) {
  const b = String(baseUrl).replace(/\/$/, "");
  const r = String(pathAfterAdmin).replace(/^\//, "");
  if (b.toLowerCase().endsWith("/api")) {
    return `${b}/admin/${r}`;
  }
  return `${b}/api/admin/${r}`;
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

function parseJsonField(val, fallback) {
  if (val == null || val === "") return fallback;
  if (typeof val === "object" && !Array.isArray(val)) return { ...fallback, ...val };
  if (typeof val === "string") {
    try {
      const p = JSON.parse(val);
      return typeof p === "object" && p != null ? p : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** If `s` is a stringified JSON array, return parsed string array; else null. */
function tryParseStringArray(s) {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t.startsWith("[")) return null;
  try {
    const p = JSON.parse(t);
    return Array.isArray(p) ? p : null;
  } catch {
    return null;
  }
}

/**
 * Some APIs store `features` as a JSON string, or an array with one element that is that string
 * (double-encoded). Flatten to a list of display strings.
 */
function parseFeatures(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    const out = [];
    for (const x of raw) {
      if (x == null) continue;
      if (typeof x === "string") {
        const inner = tryParseStringArray(x);
        if (inner) {
          for (const f of inner) {
            const line = String(f).trim();
            if (line) out.push(line);
          }
        } else {
          const line = x.trim();
          if (line) out.push(line);
        }
      } else {
        const line = String(x).trim();
        if (line) out.push(line);
      }
    }
    return out;
  }
  if (typeof raw === "string") {
    const inner = tryParseStringArray(raw);
    if (inner) return inner.map((f) => String(f).trim()).filter(Boolean);
    return raw
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

/** Map API document → UI plan shape used by subscription admin */
export function mapPlanFromApi(raw) {
  if (!raw) return null;
  const id = raw._id ?? raw.id;
  if (id == null || id === "") return null;

  const name = String(raw.name ?? raw.planName ?? raw.title ?? "").trim();
  const tagline = String(raw.tagline ?? raw.subtitle ?? "Perfect to get started").trim() || "Perfect to get started";
  const price = String(raw.price ?? raw.amount ?? raw.planPrice ?? "").trim();

  let period = String(raw.period ?? "").trim();
  if (!period) {
    const pd = Number.parseInt(
      String(raw.periodDays ?? raw.durationDays ?? raw.duration ?? raw.days ?? DEFAULT_PERIOD).replace(/[^\d]/g, ""),
      10
    );
    if (Number.isFinite(pd) && pd > 0) period = `${pd} days`;
    else period = "30 days";
  }

  const features = parseFeatures(raw.features);
  const access = {
    ...DEFAULT_ACCESS,
    ...parseJsonField(raw.access, {}),
  };
  const accessItems = {
    ...DEFAULT_ACCESS_ITEMS,
  };
  const ai = parseJsonField(raw.accessItems, null);
  if (ai && typeof ai === "object" && ai.fitnessPrograms) {
    accessItems.fitnessPrograms = {
      mode: ai.fitnessPrograms.mode === "selected" ? "selected" : "all",
      ids: Array.isArray(ai.fitnessPrograms.ids) ? ai.fitnessPrograms.ids : [],
    };
  }

  return { id: String(id), name, tagline, price, period, features, access, accessItems };
}

function extractPlansFromListResponse(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.plans)) return data.plans;
  const result = data?.result ?? data?.data ?? {};
  if (Array.isArray(result)) return result;
  const raw =
    result.plans ??
    result.data ??
    result.items ??
    result.list ??
    (Array.isArray(result.rows) ? result.rows : null);
  if (Array.isArray(raw)) return raw;
  return [];
}

function periodDaysFromPlan({ period, features: _f, access: _a, accessItems: _i, name, tagline, price, ..._rest }) {
  const s = String(period ?? "");
  const n = Number.parseInt(s.replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(n) && n > 0) return n;
  return DEFAULT_PERIOD;
}

/**
 * Build a body object (JSON) / fields for a plan — duplicate keys for varying backends.
 */
function buildPlanPayloadForApi(body) {
  const { name, tagline, price, period, features, access, accessItems } = body;
  const periodDays = periodDaysFromPlan(body);
  const feat = Array.isArray(features) ? features : [];
  const acc = access && typeof access === "object" ? access : DEFAULT_ACCESS;
  const accIt = accessItems && typeof accessItems === "object" ? accessItems : DEFAULT_ACCESS_ITEMS;

  return {
    name: name != null ? String(name) : "",
    planName: name != null ? String(name) : "",
    title: name != null ? String(name) : "",
    tagline: tagline != null ? String(tagline) : "",
    description: tagline != null ? String(tagline) : "",
    price: price != null ? String(price) : "",
    amount: price != null ? String(price) : "",
    period: period != null ? String(period) : "",
    periodDays,
    durationDays: periodDays,
    features: feat,
    access: acc,
    accessItems: accIt,
  };
}

function appendPlanFields(fd, { name, tagline, price, period, features, access, accessItems }) {
  const built = buildPlanPayloadForApi({ name, tagline, price, period, features, access, accessItems });
  fd.append("name", built.name);
  fd.append("tagline", built.tagline);
  fd.append("price", built.price);
  fd.append("period", built.period);
  fd.append("periodDays", String(built.periodDays));
  const featArray = Array.isArray(features) ? features : [];
  fd.append("features", JSON.stringify(featArray));
  fd.append("access", JSON.stringify(built.access));
  fd.append("accessItems", JSON.stringify(built.accessItems));
  fd.append("planName", built.planName);
  fd.append("title", built.title);
}

function appendUrlEncodedFields(params, body) {
  const built = buildPlanPayloadForApi(body);
  params.set("name", built.name);
  params.set("tagline", built.tagline);
  params.set("price", built.price);
  params.set("period", built.period);
  params.set("periodDays", String(built.periodDays));
  params.set("features", JSON.stringify(built.features));
  params.set("access", JSON.stringify(built.access));
  params.set("accessItems", JSON.stringify(built.accessItems));
  params.set("planName", built.planName);
  params.set("title", built.title);
}

/**
 * Tries: JSON (express.json) → FormData (multer upload.none) → x-www-form-urlencoded
 */
async function postPlanPayload(url, body, token, failMsg) {
  const auth = buildFaqAuthHeaders(token);
  const built = buildPlanPayloadForApi(body);
  const strategies = [
    () => {
      const fd = new FormData();
      appendPlanFields(fd, body);
      return axios.post(url, fd, { headers: auth, timeout: 45000 });
    },
    () => axios.post(url, built, { headers: { ...auth, "Content-Type": "application/json" }, timeout: 45000 }),
    () => {
      const p = new URLSearchParams();
      appendUrlEncodedFields(p, body);
      return axios.post(url, p, {
        headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 45000,
      });
    },
  ];

  let lastErr;
  for (const run of strategies) {
    try {
      const res = await run();
      return assertOkResponse(res, failMsg);
    } catch (e) {
      if (e?.adminPayload) throw e;
      if (e?.isAuthError) throw e;
      const st = e?.response?.status;
      if (st === 401 || st === 403) {
        e.isAuthError = true;
        throw e;
      }
      if (e?.response?.data && typeof e.response.data === "object" && isAdminApiErrorPayload(e.response.data)) {
        const d = e.response.data;
        const err = new Error(d.message || d.msg || failMsg);
        err.adminPayload = d;
        if (isAdminApiAuthError(d)) err.isAuthError = true;
        throw err;
      }
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  throw new Error(failMsg);
}

export async function fetchAllSubscriptionPlans({ token, baseUrl }) {
  if (!token || !baseUrl) throw new Error("Missing token or API base URL");
  const base = String(baseUrl).replace(/\/$/, "");
  const headers = buildFaqAuthHeaders(token);
  const listUrl = joinAdminPath(base, "get-all-plans");

  let res;
  try {
    res = await axios.get(listUrl, {
      headers,
      timeout: 30000,
      params: { _t: Date.now() },
    });
  } catch (e) {
    if (e?.response?.status === 405 || e?.response?.status === 404) {
      const fd = new FormData();
      fd.append("_", "");
      res = await axios.post(listUrl, fd, { headers, timeout: 30000, params: { _t: Date.now() } });
    } else {
      throw e;
    }
  }

  const payload = res?.data ?? {};
  if (isAdminApiErrorPayload(payload)) {
    const err = new Error(payload.message || "Failed to load subscription plans");
    err.adminPayload = payload;
    if (isAdminApiAuthError(payload)) err.isAuthError = true;
    throw err;
  }
  const rawList = extractPlansFromListResponse(payload);
  return rawList.map(mapPlanFromApi).filter(Boolean);
}

export async function createSubscriptionPlan(body, { token, baseUrl }) {
  if (!token || !baseUrl) throw new Error("Missing token or API base URL");
  const base = String(baseUrl).replace(/\/$/, "");
  const url = joinAdminPath(base, "add-plan");
  return postPlanPayload(url, body, token, "Failed to create plan");
}

export async function updateSubscriptionPlan(id, body, { token, baseUrl }) {
  if (!id || !token || !baseUrl) throw new Error("Missing id, token, or API base URL");
  const base = String(baseUrl).replace(/\/$/, "");
  const url = `${joinAdminPath(base, "update-plan")}/${encodeURIComponent(id)}`;
  return postPlanPayload(url, body, token, "Failed to update plan");
}

export async function deleteSubscriptionPlan(id, { token, baseUrl }) {
  if (!id || !token || !baseUrl) throw new Error("Missing id, token, or API base URL");
  const base = String(baseUrl).replace(/\/$/, "");
  const url = `${joinAdminPath(base, "delete-plan")}/${encodeURIComponent(id)}`;
  const auth = buildFaqAuthHeaders(token);
  const fd = new FormData();
  fd.append("_", "");
  const res = await axios.post(url, fd, { headers: auth, timeout: 30000 });
  return assertOkResponse(res, "Failed to delete plan");
}
