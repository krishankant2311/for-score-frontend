/**
 * Admin push notifications — send-notification (POST), get-all-notifications (GET).
 * Uses JSON body + token header (matches admin curl examples).
 */

import axios from "axios";
import { joinAdminPath } from "@/lib/subscriptionPlanApi";
import { isAdminApiAuthError, isAdminApiErrorPayload } from "@/lib/fitnessProgramApi";

function formatDate(d) {
  if (d == null || d === "") return "—";
  try {
    const t = new Date(d).getTime();
    if (Number.isNaN(t)) return String(d);
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

function formatDateTime(d) {
  if (d == null || d === "") return "—";
  try {
    const t = new Date(d).getTime();
    if (Number.isNaN(t)) return String(d);
    return new Date(d).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(d);
  }
}

export function buildNotificationAuthHeaders(token) {
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

function normalizeStatus(raw) {
  const s = String(raw ?? "Sent").trim();
  if (s === "Draft") return "Draft";
  if (s === "Scheduled") return "Scheduled";
  if (s === "Failed") return "Failed";
  return "Sent";
}

export function mapNotificationFromApi(raw) {
  if (!raw) return null;
  const id = raw._id ?? raw.id ?? raw.notificationId;
  if (id == null || id === "") return null;

  const sendToAll = raw.sendToAll ?? raw.send_to_all;
  const playerIds = raw.playerIds ?? raw.player_ids ?? raw.userIds ?? raw.recipientIds ?? [];
  const ids = Array.isArray(playerIds)
    ? [...new Set(playerIds.map((x) => String(x).trim()).filter(Boolean))]
    : [];

  let recipientMode = "custom";
  if (raw.recipientMode) {
    const rm = String(raw.recipientMode).toLowerCase();
    if (rm === "all" || rm === "active" || rm === "custom") recipientMode = rm;
  } else {
    const aud = raw.audience ?? raw.target;
    if (typeof aud === "string") {
      const a = aud.toLowerCase().replace(/\s/g, "");
      if (a === "all" || a === "everyone" || a === "broadcast") recipientMode = "all";
      else if (a === "active" || a === "activeusers") recipientMode = "active";
      else if (a === "custom" || a === "selected" || a === "users") recipientMode = "custom";
    }
    if (sendToAll === true) {
      recipientMode = "all";
    } else if (ids.length > 0) {
      recipientMode = "custom";
    } else {
      recipientMode = recipientMode === "all" ? "all" : "active";
    }
  }

  const title = raw.title ?? raw.subject ?? "—";
  const message = raw.message ?? raw.body ?? raw.content ?? "";

  const status = normalizeStatus(raw.status ?? raw.state);
  const scheduledRaw =
    raw.scheduledAt ?? raw.scheduled_at ?? raw.scheduleAt ?? raw.data?.scheduledAt;
  const hasScheduledAt =
    scheduledRaw != null &&
    scheduledRaw !== "" &&
    !Number.isNaN(new Date(scheduledRaw).getTime());
  const scheduledAt = hasScheduledAt
    ? formatDateTime(scheduledRaw)
    : status === "Scheduled"
      ? "Not set"
      : "—";

  return {
    id: String(id),
    title,
    message,
    recipientMode,
    selectedUserIds: ids,
    type: raw.type ?? raw.category ?? "General",
    status,
    hasScheduledAt,
    scheduledAt,
    createdAt: formatDateTime(raw.createdAt ?? raw.created_at ?? raw.date ?? raw.sentAt),
    _raw: raw,
  };
}

export function extractNotificationList(payload) {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.notifications)) return payload.notifications;
  if (Array.isArray(payload.items)) return payload.items;
  const result = payload?.result ?? payload?.data ?? {};
  if (Array.isArray(result)) return result;
  const nested =
    result.notifications ??
    result.items ??
    result.list ??
    result.rows ??
    result.records ??
    (Array.isArray(result.data) ? result.data : null);
  if (Array.isArray(nested)) return nested;
  return [];
}

export function extractNotificationPagination(payload, listLength, page, limit) {
  const result = payload?.result ?? payload?.data ?? payload ?? {};
  const total = result.total ?? result.totalCount ?? result.count ?? result.totalRecords;
  const totalFromApi =
    typeof total === "number" && Number.isFinite(total) && total >= 0 ? Math.floor(total) : null;
  const tp = result.totalPages;
  let totalPagesFromApi =
    typeof tp === "number" && Number.isFinite(tp) && tp >= 0 ? Math.floor(tp) : null;

  const statusCounts = result.statusCounts ?? null;

  if (totalFromApi != null) {
    const totalItems = totalFromApi;
    const totalPages =
      totalPagesFromApi ?? (totalItems > 0 ? Math.max(1, Math.ceil(totalItems / Math.max(1, limit))) : 0);
    return { totalItems, totalPages, statusCounts };
  }

  const base = (page - 1) * limit + listLength;
  if (listLength < limit) {
    return { totalItems: base, totalPages: base > 0 ? Math.max(1, page) : 0, statusCounts };
  }
  return { totalItems: base + 1, totalPages: page + 1, statusCounts };
}

/**
 * GET — query: page, limit, status (all|sent|scheduled|draft)
 */
export async function fetchAllNotifications({ token, baseUrl, page = 1, limit = 10, status = "" } = {}) {
  if (!token || !baseUrl) throw new Error("Missing token or API base URL");
  const url = joinAdminPath(baseUrl, "get-all-notifications");
  const params = { page, limit };
  if (status && status !== "all") params.status = status;
  const res = await axios.get(url, {
    headers: buildNotificationAuthHeaders(token),
    params,
    timeout: 30000,
  });
  assertOkPayload(res.data, "Failed to load notifications");
  const rows = extractNotificationList(res.data);
  const mapped = rows.map(mapNotificationFromApi).filter(Boolean);
  const meta = extractNotificationPagination(res.data, mapped.length, page, limit);
  return { list: mapped, ...meta, raw: res.data };
}

function toAdminApiError(err, fallbackMessage) {
  const data = err?.response?.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const detail =
      (typeof data.error === "string" && data.error.trim()) ||
      data.message ||
      data.msg ||
      fallbackMessage;
    const e = new Error(detail);
    e.adminPayload = data;
    e.statusCode = err?.response?.status;
    if (isAdminApiAuthError(data)) e.isAuthError = true;
    return e;
  }
  const e = new Error(err?.message || fallbackMessage);
  e.cause = err;
  if (err?.response?.status) e.statusCode = err.response.status;
  return e;
}

/**
 * POST body: { title, message, sendToAll, userIds?, playerIds? }
 * - userIds: Mongo user _id (admin panel selection)
 * - playerIds: OneSignal subscription UUID (manual / Postman)
 */
export async function sendAdminNotification({
  token,
  baseUrl,
  title,
  message,
  sendToAll,
  userIds,
  playerIds,
  deliveryMode = "now",
  scheduledAt,
  type = "General",
  recipientMode,
} = {}) {
  if (!token || !baseUrl) throw new Error("Missing token or API base URL");
  const url = joinAdminPath(baseUrl, "send-notification");
  const body = {
    title: String(title ?? "").trim(),
    message: String(message ?? "").trim(),
    sendToAll: Boolean(sendToAll),
    deliveryMode: String(deliveryMode ?? "now").trim().toLowerCase(),
    type: String(type ?? "General").trim() || "General",
  };
  if (recipientMode) body.recipientMode = recipientMode;
  if (body.deliveryMode === "schedule" && scheduledAt) {
    body.scheduledAt = scheduledAt;
  }
  if (!body.sendToAll && Array.isArray(userIds) && userIds.length) {
    body.userIds = userIds.map((id) => String(id));
  }
  if (!body.sendToAll && Array.isArray(playerIds) && playerIds.length) {
    body.playerIds = playerIds.map((id) => String(id));
  }
  if (body.deliveryMode !== "draft" && !body.sendToAll && !body.userIds?.length && !body.playerIds?.length) {
    throw new Error("No recipients: set sendToAll or pass userIds / playerIds.");
  }
  if (body.deliveryMode === "schedule" && !body.scheduledAt) {
    throw new Error("scheduledAt is required when scheduling a notification.");
  }
  try {
    const res = await axios.post(url, body, {
      headers: {
        ...buildNotificationAuthHeaders(token),
        "Content-Type": "application/json",
      },
      timeout: 60000,
    });
    assertOkPayload(res.data, "Failed to send notification");
    return res.data;
  } catch (err) {
    if (err?.adminPayload) throw err;
    if (err?.response?.data !== undefined) {
      throw toAdminApiError(err, "Failed to send notification");
    }
    throw err;
  }
}
