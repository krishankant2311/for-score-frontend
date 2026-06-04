/**
 * Admin fitness program API helpers.
 * Backend: multipart FormData — text fields + optional files (`video`, `media`,
 * `library_media`, `recovery_media`) with parallel `*_targets` JSON arrays.
 */

import axios from "axios";

export const PROGRAM_CACHE_PREFIX = "program-cache:";
export const PROGRAM_EDIT_PREFIX = "program-edit:";

/** Best-effort email from a JWT payload (for multipart `email` on add/update program). */
export function decodeEmailFromJwt(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
    return JSON.parse(atob(padded))?.email ?? null;
  } catch {
    return null;
  }
}

/** Combined `weekend` for backends that still expect a single Sat/Sun field. */
function legacyWeekendFromSatSun(sat, sun) {
  const s = String(sat ?? "").trim();
  const u = String(sun ?? "").trim();
  if (!s && !u) return "";
  if (s === u) return s;
  if (!s) return u;
  if (!u) return s;
  return `${s} | ${u}`;
}

/**
 * Read `sat` / `sun` from a page2 week bucket or schedule row.
 * Legacy rows may only have `weekend`; both days then share that value.
 */
function page2RowToSatSun(row) {
  if (!row || typeof row !== "object") return { sat: "", sun: "" };
  const legacy = String(row.weekend ?? "").trim();
  const hasSatKey = Object.prototype.hasOwnProperty.call(row, "sat");
  const hasSunKey = Object.prototype.hasOwnProperty.call(row, "sun");
  if (!hasSatKey && !hasSunKey) {
    return { sat: legacy, sun: legacy };
  }
  let sat = hasSatKey ? String(row.sat ?? "").trim() : legacy;
  let sun = hasSunKey ? String(row.sun ?? "").trim() : legacy;
  if (hasSatKey && hasSunKey && !sat && !sun && legacy) {
    sat = legacy;
    sun = legacy;
  }
  return { sat, sun };
}

export function normalizeScheduleRows(schedule) {
  if (!Array.isArray(schedule)) return schedule;
  return schedule.map((r) => {
    if (!r || typeof r !== "object") return r;
    const w = Number(r.week);
    const week = Number.isFinite(w) ? w : r.week;
    const { sat, sun } = page2RowToSatSun(r);
    return {
      week,
      mon: r.mon ?? "",
      tue: r.tue ?? "",
      wed: r.wed ?? "",
      thu: r.thu ?? "",
      fri: r.fri ?? "",
      sat,
      sun,
    };
  });
}

function scheduleArrayToPage2(schedule) {
  if (!Array.isArray(schedule)) return null;
  const out = {};
  for (const row of schedule) {
    const w = Number(row?.week);
    if (!Number.isFinite(w) || w < 1) continue;
    const { sat, sun } = page2RowToSatSun(row);
    out[`week${w}`] = {
      mon: row?.mon ?? "",
      tue: row?.tue ?? "",
      wed: row?.wed ?? "",
      thu: row?.thu ?? "",
      fri: row?.fri ?? "",
      sat,
      sun,
      weekend: legacyWeekendFromSatSun(sat, sun),
    };
  }
  return Object.keys(out).length ? out : null;
}

function page2ToScheduleArray(page2, fallbackSchedule) {
  if (!page2 || typeof page2 !== "object" || Array.isArray(page2)) return fallbackSchedule;
  const weeks = Object.keys(page2)
    .map((k) => {
      const m = String(k).match(/^week(\d+)$/i);
      return m ? Number(m[1]) : null;
    })
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  if (!weeks.length) return fallbackSchedule;

  return weeks.map((w) => {
    const row = page2[`week${w}`] ?? page2[`Week${w}`] ?? {};
    const { sat, sun } = page2RowToSatSun(row);
    return {
      week: w,
      mon: row?.mon ?? "",
      tue: row?.tue ?? "",
      wed: row?.wed ?? "",
      thu: row?.thu ?? "",
      fri: row?.fri ?? "",
      sat,
      sun,
    };
  });
}

function weekGridToScheduleArray(weekGrid, fallbackSchedule) {
  // Backend schema: { week1: {mon,tue,...}, week2: {...} }
  return page2ToScheduleArray(weekGrid, fallbackSchedule);
}

function workoutsToPage3(workouts) {
  if (!workouts || typeof workouts !== "object" || Array.isArray(workouts)) return null;
  const A = Array.isArray(workouts.A) ? workouts.A : [];
  const B = Array.isArray(workouts.B) ? workouts.B : [];
  const C = Array.isArray(workouts.C) ? workouts.C : [];
  const out = {
    workoutA: A,
    workoutB: B,
    workoutC: C,
  };
  const hasAny = A.length || B.length || C.length;
  return hasAny ? out : null;
}

function firstNonEmptyArr(...candidates) {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c;
  }
  return null;
}

function page3ToWorkouts(page3, fallbackWorkouts) {
  if (!page3 || typeof page3 !== "object" || Array.isArray(page3)) return fallbackWorkouts;
  const A = firstNonEmptyArr(
    page3.workoutA,
    page3.A,
    page3.LOWER,
    page3.LEGS
  );
  const B = firstNonEmptyArr(page3.workoutB, page3.B, page3.UPPER, page3.PUSH);
  const C = firstNonEmptyArr(page3.workoutC, page3.C, page3.FULL, page3.PULL);

  const any = A || B || C;
  if (!any) return fallbackWorkouts;

  return {
    A: A ?? fallbackWorkouts?.A ?? [],
    B: B ?? fallbackWorkouts?.B ?? [],
    C: C ?? fallbackWorkouts?.C ?? [],
  };
}

function exerciseLibraryToWorkouts(exerciseLibrary, fallbackWorkouts) {
  // Backend schema: { workoutA: [], workoutB: [], workoutC: [] }
  return page3ToWorkouts(exerciseLibrary, fallbackWorkouts);
}

function recoveryToPage4(recovery) {
  if (!recovery || typeof recovery !== "object" || Array.isArray(recovery)) return null;
  // Backend schemas vary; we keep a stable key and also mirror into Tue/Thu if backend expects day objects.
  return {
    recovery,
    tue: { recovery },
    thu: { recovery },
  };
}

function page4ToRecovery(page4, fallbackRecovery) {
  if (!page4 || typeof page4 !== "object" || Array.isArray(page4)) return fallbackRecovery;
  // Prefer explicit recovery object; otherwise accept nested under tue/thu.
  const r =
    page4.recovery ??
    page4?.tue?.recovery ??
    page4?.thu?.recovery ??
    null;
  if (!r || typeof r !== "object" || Array.isArray(r)) return fallbackRecovery;
  return r;
}

function recoveryProtocolToRecovery(recoveryProtocol, fallbackRecovery) {
  if (!recoveryProtocol || typeof recoveryProtocol !== "object" || Array.isArray(recoveryProtocol)) {
    return page4ToRecovery(recoveryProtocol, fallbackRecovery);
  }

  const fb = fallbackRecovery &&
    typeof fallbackRecovery === "object" &&
    !Array.isArray(fallbackRecovery)
    ? fallbackRecovery
    : { lissMinutes: 20, lissPrompt: "", lissOptions: "", stretches: [{ name: "", detail: "" }] };

  // Mobile API: { cardio: { durationMinutes, coachPrompt, activityOptions }, stretches: [{ name, detail }] }
  if (
    "cardio" in recoveryProtocol ||
    (Array.isArray(recoveryProtocol.stretches) && recoveryProtocol.stretches.length > 0)
  ) {
    const c =
      recoveryProtocol.cardio && typeof recoveryProtocol.cardio === "object"
        ? recoveryProtocol.cardio
        : {};
    const opts = Array.isArray(c.activityOptions)
      ? c.activityOptions.map((x) => String(x).trim()).filter(Boolean).join(", ")
      : typeof c.activityOptions === "string"
        ? c.activityOptions
        : "";
    let stretchesUi = Array.isArray(fb.stretches) ? fb.stretches : [];
    const stretchesIn = recoveryProtocol.stretches;
    if (Array.isArray(stretchesIn) && stretchesIn.length) {
      stretchesUi = stretchesIn.map((s) =>
        typeof s === "string"
          ? { name: s, detail: "" }
          : { name: String(s?.name ?? ""), detail: String(s?.detail ?? "") }
      );
    }
    const baseMediaUrls = Array.isArray(fb.mediaUrls) ? fb.mediaUrls.filter(Boolean).map(String) : [];
    const fromCardio = [];
    const pushUrl = (u) => {
      const s = String(u ?? "").trim();
      if (s) fromCardio.push(s);
    };
    pushUrl(c.media_url);
    pushUrl(c.mediaUrl);
    if (Array.isArray(c.media_urls)) {
      for (const u of c.media_urls) pushUrl(u);
    }
    const mediaUrls = Array.from(new Set([...baseMediaUrls, ...fromCardio]));

    return {
      ...fb,
      lissMinutes:
        Number(c.durationMinutes) > 0 ? Number(c.durationMinutes) : Number(fb.lissMinutes) || 20,
      lissPrompt: c.coachPrompt != null ? String(c.coachPrompt) : fb.lissPrompt,
      lissOptions: opts || fb.lissOptions,
      stretches: stretchesUi,
      mediaUrls,
      pendingUploads: [],
    };
  }

  // Day-keyed e.g. { mon: { stretch: ["…"] } }
  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const collected = [];
  for (const dk of dayKeys) {
    const block = recoveryProtocol[dk];
    if (!block || typeof block !== "object" || Array.isArray(block)) continue;
    const arr = block.stretch ?? block.stretches;
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      collected.push(
        typeof item === "string"
          ? { name: item, detail: "" }
          : { name: String(item?.name ?? ""), detail: String(item?.detail ?? "") }
      );
    }
  }
  if (collected.length) {
    return { ...fb, stretches: collected };
  }

  return page4ToRecovery(recoveryProtocol, fallbackRecovery);
}

function scheduleRowHasAnyDayContent(row) {
  if (!row) return false;
  const keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  if (keys.some((k) => String(row[k] ?? "").trim())) return true;
  return Boolean(String(row?.weekend ?? "").trim());
}

function isProbablyEmptySchedule(schedule) {
  if (!Array.isArray(schedule) || schedule.length === 0) return true;
  return schedule.every((row) => !scheduleRowHasAnyDayContent(row));
}

function isProbablyEmptyWorkouts(workouts) {
  if (!workouts || typeof workouts !== "object" || Array.isArray(workouts)) return true;
  const letters = ["A", "B", "C"];
  return letters.every((l) => {
    const list = workouts?.[l];
    if (!Array.isArray(list) || list.length === 0) return true;
    return list.every((ex) => workoutExerciseRowIsEmpty(ex));
  });
}

const WORKOUT_LETTER_LABEL = { A: "Workout A", B: "Workout B", C: "Workout C" };

function workoutExerciseRowIsEmpty(ex) {
  if (!ex || typeof ex !== "object") return true;
  const name = String(ex?.name ?? "").trim();
  const sets = ex?.target_sets;
  const hasSets = sets !== "" && sets != null && !Number.isNaN(Number(sets));
  const reps = String(ex?.target_reps_range ?? "").trim();
  const muscles = String(ex?.targetMusclesText ?? "").trim();
  const inst = String(ex?.instructionsText ?? "").trim();
  return !name && !hasSets && !reps && !muscles && !inst;
}

/** Validate rep range text — rejects empty, 0, 0-0, and invalid ranges. Returns error or null. */
export function validateRepRange(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Rep range is required.";

  const compact = raw.replace(/\s+/g, "");
  if (/^0[-–—]0$/i.test(compact)) {
    return "Rep range cannot be 0–0. Enter a valid range (e.g. 8–12).";
  }

  const normalized = raw.replace(/[–—]/g, "-").replace(/\s+/g, "");

  if (/^\d+$/.test(normalized)) {
    const n = Number(normalized);
    if (!Number.isFinite(n) || n < 1) return "Rep range must be at least 1.";
    return null;
  }

  const rangeMatch = normalized.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const low = Number(rangeMatch[1]);
    const high = Number(rangeMatch[2]);
    if (low === 0 && high === 0) {
      return "Rep range cannot be 0–0. Enter a valid range (e.g. 8–12).";
    }
    if (low < 1 || high < 1) return "Rep range values must be at least 1.";
    if (low > high) return "Rep range min cannot be greater than max (e.g. 8–12).";
    return null;
  }

  return "Enter a valid rep range (e.g. 8–12 or 10).";
}

function validateWorkoutExerciseRow(ex, letter, index) {
  const slot = `${WORKOUT_LETTER_LABEL[letter] ?? `Workout ${letter}`} row ${index + 1}`;
  const name = String(ex?.name ?? "").trim();
  if (!name) return `${slot}: Exercise name is required.`;

  const ts = ex?.target_sets;
  if (ts === "" || ts == null || Number.isNaN(Number(ts)) || Number(ts) < 1) {
    return `${slot} (“${name}”): Sets is required (≥ 1).`;
  }

  const repErr = validateRepRange(ex?.target_reps_range);
  if (repErr) return `${slot} (“${name}”): ${repErr}`;

  if (!String(ex?.targetMusclesText ?? "").trim()) {
    return `${slot} (“${name}”): Target muscles is required.`;
  }

  const inst = String(ex?.instructionsText ?? "").trim();
  if (!inst || !inst.split(/\r?\n/).some((line) => line.trim())) {
    return `${slot} (“${name}”): Add at least one instruction line.`;
  }

  return null;
}

/** Block “+ Add exercise” until the current last row is fully filled. */
export function validateWorkoutBlockBeforeAddExercise(list, letter = "A") {
  const label = WORKOUT_LETTER_LABEL[letter] ?? `Workout ${letter}`;
  if (!Array.isArray(list) || list.length === 0) return null;

  const last = list[list.length - 1];
  if (workoutExerciseRowIsEmpty(last)) {
    return `${label}: fill in the current exercise before adding another.`;
  }

  return validateWorkoutExerciseRow(last, letter, list.length - 1);
}

function isProbablyEmptyRecovery(recovery) {
  if (!recovery || typeof recovery !== "object" || Array.isArray(recovery)) return true;
  const prompt = String(recovery?.lissPrompt ?? "").trim();
  const opts = String(recovery?.lissOptions ?? "").trim();
  const stretches = Array.isArray(recovery?.stretches) ? recovery.stretches : [];
  const hasStretch = stretches.some(
    (s) => String(s?.name ?? "").trim() || String(s?.detail ?? "").trim()
  );
  return !prompt && !opts && !hasStretch;
}

function validateOverviewForSave(draft) {
  if (!draft?.title?.trim() || !draft?.subHeader?.trim() || !draft?.overview?.trim()) {
    return "Program name, Sub-header, and Overview are required.";
  }
  if (!draft?.level?.trim()) return "Level is required.";
  const w = Number(draft.durationWeeks);
  const f = Number(draft.frequencyPerWeek);
  const a = Number(draft.avgSessionMinutes);
  if (Number.isNaN(w) || w < 1 || Number.isNaN(f) || f < 1 || Number.isNaN(a) || a < 1) {
    return "Enter valid duration, days per week, and avg. session (numbers ≥ 1).";
  }
  if (!String(draft.frequencyCaption ?? "").trim()) {
    return "Frequency (single line for the app) is required.";
  }
  return null;
}

/** Per workout block: every non-empty row must be complete; A/B/C each need ≥1 exercise. */
export function validateWorkoutsCompleteForSave(workouts) {
  const letters = ["A", "B", "C"];

  for (const L of letters) {
    const list = Array.isArray(workouts?.[L]) ? workouts[L] : [];
    const label = WORKOUT_LETTER_LABEL[L];

    if (list.length === 0) {
      return `${label}: add at least one exercise.`;
    }

    let completeCount = 0;

    for (let i = 0; i < list.length; i++) {
      const ex = list[i];
      if (workoutExerciseRowIsEmpty(ex)) {
        if (list.length > 1) {
          return `${label} row ${i + 1}: remove empty rows or complete this exercise.`;
        }
        continue;
      }

      const err = validateWorkoutExerciseRow(ex, L, i);
      if (err) return err;
      completeCount++;
    }

    if (completeCount === 0) {
      return `${label}: add at least one complete exercise (name, sets, rep range, muscles, instructions).`;
    }
  }

  return null;
}

function stretchRowIsEmpty(s) {
  if (!s || typeof s !== "object") return true;
  return !String(s?.name ?? "").trim() && !String(s?.detail ?? "").trim();
}

function validateStretchRow(s, index) {
  const slot = `Stretch ${index + 1}`;
  const name = String(s?.name ?? "").trim();
  const detail = String(s?.detail ?? "").trim();
  if (!name) return `${slot}: Stretch name is required.`;
  if (!detail) return `${slot} (“${name}”): Detail / duration is required.`;
  return null;
}

/** Block “+ Add stretch” until the current last row is fully filled. */
export function validateRecoveryBlockBeforeAddStretch(stretches) {
  if (!Array.isArray(stretches) || stretches.length === 0) return null;
  const last = stretches[stretches.length - 1];
  if (stretchRowIsEmpty(last)) {
    return "Big 4 stretches: fill in the current stretch before adding another.";
  }
  return validateStretchRow(last, stretches.length - 1);
}

/** Stricter than isProbablyEmptyRecovery — coach prompt, options, stretch name + detail. */
export function validateRecoveryForSave(recovery) {
  const r = recovery && typeof recovery === "object" && !Array.isArray(recovery) ? recovery : null;
  if (!r) return "Part 3 · Recovery: complete LISS and stretches.";
  const minutes = Number(r.lissMinutes);
  if (!Number.isFinite(minutes) || minutes < 1) {
    return "Part 3 · Recovery: LISS duration (minutes) must be at least 1.";
  }
  if (!String(r.lissPrompt ?? "").trim()) {
    return "Part 3 · Recovery: Coach prompt is required.";
  }
  if (!String(r.lissOptions ?? "").trim()) {
    return "Part 3 · Recovery: Activity options is required.";
  }
  const stretches = Array.isArray(r.stretches) ? r.stretches : [];
  if (stretches.length === 0) {
    return "Part 3 · Recovery: add at least one stretch with both name and detail.";
  }

  let completeCount = 0;
  for (let i = 0; i < stretches.length; i++) {
    const s = stretches[i];
    if (stretchRowIsEmpty(s)) {
      if (stretches.length > 1) {
        return `Big 4 stretches row ${i + 1}: remove empty rows or complete this stretch.`;
      }
      continue;
    }
    const err = validateStretchRow(s, i);
    if (err) return `Part 3 · Recovery: ${err}`;
    completeCount++;
  }

  if (completeCount === 0) {
    return "Part 3 · Recovery: add at least one stretch with both name and detail.";
  }
  return null;
}

/** Full save validation (overview + Part 1–3). Returns error message or null. */
export function validateFitnessProgramForSave(draft) {
  if (!draft) return "Missing program draft.";
  let msg = validateOverviewForSave(draft);
  if (msg) return msg;
  if (isProbablyEmptySchedule(draft.schedule)) {
    return "Part 1 · Logic grid: fill at least one day label in the schedule.";
  }
  msg = validateWorkoutsCompleteForSave(draft.workouts);
  if (msg) return msg;
  return validateRecoveryForSave(draft.recovery);
}

/** Wizard: schedule tab before leaving step 1 → 2 */
export function validateScheduleTab(draft) {
  if (isProbablyEmptySchedule(draft?.schedule)) {
    return "Part 1 · Logic grid: fill at least one day cell before continuing.";
  }
  return null;
}

/** Wizard: workouts tab before leaving step 2 → 3 */
export function validateWorkoutsTab(workouts) {
  return validateWorkoutsCompleteForSave(workouts);
}

export function programCacheKey(id) {
  return `${PROGRAM_CACHE_PREFIX}${id}`;
}

export function programEditKey(id) {
  return `${PROGRAM_EDIT_PREFIX}${id}`;
}

/**
 * for-score API often returns HTTP 200 with errors in JSON:
 * { success: false, statusCode: 401, message: "..." } — axios still resolves (no throw).
 */
export function isAdminApiErrorPayload(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  if (data.success === false) return true;
  if (typeof data.statusCode === "number" && data.statusCode >= 400) return true;
  const nested = data.result ?? data.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    if (nested.success === false) return true;
    if (typeof nested.statusCode === "number" && nested.statusCode >= 400) return true;
  }
  return false;
}

export function isAdminApiAuthError(data) {
  if (!isAdminApiErrorPayload(data)) return false;
  const sc = data.statusCode;
  const m = String(data.message || "").toLowerCase();
  if (sc === 401 || sc === 403) return true;
  if (m.includes("token") || m.includes("jwt") || m.includes("unauthorized") || m.includes("access denied"))
    return true;
  return false;
}

/**
 * Soft-deleted / removed docs some APIs still return — hide from admin table so the list matches “deleted”.
 */
export function rawProgramExcludedFromAdminList(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return true;
  if (raw.isDeleted === true || raw.deleted === true) return true;
  const delAt = raw.deletedAt ?? raw.deleted_at;
  if (delAt != null && String(delAt).trim() !== "") return true;
  const s = String(raw.status ?? raw.programStatus ?? "").trim().toLowerCase();
  if (s === "deleted" || s === "removed") return true;
  return false;
}

/** Normalise status from various backend shapes (avoid defaulting everything to Active). */
function deriveProgramListStatus(raw) {
  if (!raw || typeof raw !== "object") return "Active";

  const flag =
    raw.isActive !== undefined
      ? raw.isActive
      : raw.active !== undefined
        ? raw.active
        : raw.IsActive;
  if (flag === false) return "Inactive";
  if (flag === true) return "Active";

  const s = raw.status ?? raw.programStatus ?? raw.state;
  if (typeof s === "boolean") return s ? "Active" : "Inactive";
  if (typeof s === "number" && Number.isFinite(s)) {
    if (s === 0) return "Inactive";
    if (s === 1) return "Active";
  }
  const str = String(s ?? "").trim();
  if (!str) return "Active";
  const low = str.toLowerCase();
  if (low === "inactive" || low === "disabled") return "Inactive";
  if (low === "deleted" || low === "removed") return "Deleted";
  if (low === "archived") return "Archived";
  if (low === "active") return "Active";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Map API document → list row + keep raw for edit/view cache */
export function mapProgramFromApi(raw) {
  if (!raw) return null;
  const id = raw?._id ?? raw?.id;
  if (!id) return null;

  const updatedAt = raw?.updatedAt
    ? new Date(raw.updatedAt).toISOString().slice(0, 10)
    : raw?.updated_at
      ? new Date(raw.updated_at).toISOString().slice(0, 10)
      : "";

  const durationWeeks = Number(raw?.durationWeeks ?? raw?.duration_weeks ?? 0);
  const frequencyPerWeek = Number(raw?.frequencyPerWeek ?? raw?.frequency_per_week ?? 0);
  const avgSessionMinutes = Number(raw?.avgSessionMinutes ?? raw?.avg_session_minutes ?? 0);

  return {
    id: String(id),
    title: raw?.programName ?? raw?.title ?? "",
    subHeader: raw?.subHeader ?? raw?.sub_header ?? "",
    level: raw?.workoutSkillLevel ?? raw?.level ?? "",
    durationWeeks: Number.isFinite(durationWeeks) && durationWeeks > 0 ? durationWeeks : 1,
    frequencyPerWeek: Number.isFinite(frequencyPerWeek) && frequencyPerWeek > 0 ? frequencyPerWeek : 1,
    avgSessionMinutes: Number.isFinite(avgSessionMinutes) && avgSessionMinutes > 0 ? avgSessionMinutes : 1,
    status: deriveProgramListStatus(raw),
    updatedAt: updatedAt || "—",
    _raw: raw,
  };
}

/** API may return strings or arrays for multiline copy fields */
export function coerceMultilineText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => (v == null ? "" : String(v))).join("\n");
  if (typeof value === "object") return "";
  return String(value);
}

export function coercePlainString(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => (v == null ? "" : String(v))).filter(Boolean).join(" ");
  if (typeof value === "object") return "";
  return String(value);
}

function pickDetailFromRaw(raw) {
  if (!raw) return null;
  const candidates = [
    raw.programDetail,
    raw.program_detail,
    raw.detail,
    raw.extendedData,
    raw.extended_data,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    if (typeof c === "object") return c;
    if (typeof c === "string" && c.trim()) {
      try {
        return JSON.parse(c);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function coerceTagsFromApi(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        const j = JSON.parse(t);
        if (Array.isArray(j)) return j.map((x) => String(x).trim()).filter(Boolean);
      } catch {
        /* fall through */
      }
    }
    return t
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Merge API row + optional nested JSON into editor draft shape */
export function apiRowToEditorDraft(raw, emptyTemplate) {
  const list = mapProgramFromApi(raw);
  if (!list) return null;

  const parsed = pickDetailFromRaw(raw);
  const base = emptyTemplate
    ? { ...emptyTemplate, id: list.id }
    : {
        id: list.id,
        title: list.title,
        subHeader: list.subHeader,
        overview: "",
        whatsInside: "",
        isThisForYou: "",
        theGoal: "",
        level: list.level,
        durationWeeks: list.durationWeeks,
        frequencyPerWeek: list.frequencyPerWeek,
        avgSessionMinutes: list.avgSessionMinutes,
        locationTag: "",
        equipment: "",
        status: list.status,
      };

  const merged = {
    ...base,
    title: raw?.programName ?? raw?.title ?? base.title,
    subHeader: raw?.subHeader ?? raw?.sub_header ?? base.subHeader,
    overview: raw?.overview ?? base.overview,
    whatsInside: raw?.whatsInside ?? raw?.whats_inside ?? base.whatsInside,
    isThisForYou: raw?.isThisForYou ?? raw?.is_this_for_you ?? base.isThisForYou,
    theGoal: raw?.theGoal ?? raw?.the_goal ?? raw?.goalText ?? raw?.goal_text ?? base.theGoal,
    level: raw?.workoutSkillLevel ?? raw?.level ?? base.level,
    durationWeeks: list.durationWeeks,
    frequencyPerWeek: list.frequencyPerWeek,
    avgSessionMinutes: list.avgSessionMinutes,
    frequencyCaption:
      raw?.frequencyCaption ??
      raw?.frequency_caption ??
      raw?.frequency ??
      base.frequencyCaption,
    locationTag: raw?.locationTag ?? raw?.location_tag ?? base.locationTag,
    equipment:
      Array.isArray(raw?.equipment) ? raw.equipment.join("\n") : raw?.equipment ?? base.equipment,
    equipmentNote: raw?.equipmentNote ?? raw?.equipment_note ?? base.equipmentNote,
    status: list.status,
    implementationNote: raw?.implementationNote ?? raw?.implementation_note ?? base.implementationNote,
    primaryGoal: coercePlainString(raw?.primaryGoal ?? raw?.primary_goal ?? base.primaryGoal),

    programCode: coercePlainString(raw?.programCode ?? raw?.program_code ?? base.programCode),
    tags: coerceTagsFromApi(raw?.tags ?? base.tags),
    minSessionMinutes: raw?.minSessionMinutes ?? raw?.min_session_minutes ?? base.minSessionMinutes ?? "",
    maxSessionMinutes: raw?.maxSessionMinutes ?? raw?.max_session_minutes ?? base.maxSessionMinutes ?? "",
    isGymRequired: Boolean(raw?.isGymRequired ?? raw?.is_gym_required ?? base.isGymRequired),
    isHomeFriendly: Boolean(raw?.isHomeFriendly ?? raw?.is_home_friendly ?? base.isHomeFriendly ?? true),
    isQuickProgram: Boolean(raw?.isQuickProgram ?? raw?.is_quick_program ?? base.isQuickProgram),
    isPrenatalProgram: Boolean(raw?.isPrenatalProgram ?? raw?.is_prenatal_program ?? base.isPrenatalProgram),

    // Carry backend nested shapes so we can map them into UI fields.
    weekGrid: raw?.weekGrid ?? raw?.week_grid,
    exerciseLibrary: raw?.exerciseLibrary ?? raw?.exercise_library,
    recoveryProtocol: raw?.recoveryProtocol ?? raw?.recovery_protocol,
    page2: raw?.page2,
    page3: raw?.page3,
    page4: raw?.page4,
  };

  if (parsed && typeof parsed === "object") {
    Object.assign(merged, parsed);
    merged.id = list.id;
  }

  // Backend schema (your JSON): weekGrid / exerciseLibrary / recoveryProtocol.
  if (merged.weekGrid && isProbablyEmptySchedule(merged.schedule)) {
    merged.schedule = weekGridToScheduleArray(merged.weekGrid, merged.schedule);
  }
  if (merged.exerciseLibrary && isProbablyEmptyWorkouts(merged.workouts)) {
    merged.workouts = exerciseLibraryToWorkouts(merged.exerciseLibrary, merged.workouts);
  } else if (merged.exerciseLibrary) {
    merged.workouts = mergeWorkoutsMediaFromLibrary(merged.workouts, merged.exerciseLibrary);
  }
  if (merged.recoveryProtocol && isProbablyEmptyRecovery(merged.recovery)) {
    merged.recovery = recoveryProtocolToRecovery(merged.recoveryProtocol, merged.recovery);
  }

  // If backend stores editor data as page2/3/4, map them back into UI shape.
  if (merged.page2 && isProbablyEmptySchedule(merged.schedule)) {
    merged.schedule = page2ToScheduleArray(merged.page2, merged.schedule);
  }
  if (merged.page3 && isProbablyEmptyWorkouts(merged.workouts)) {
    merged.workouts = page3ToWorkouts(merged.page3, merged.workouts);
  }
  if (merged.page4 && isProbablyEmptyRecovery(merged.recovery)) {
    merged.recovery = page4ToRecovery(merged.page4, merged.recovery);
  }

  merged.title = coercePlainString(merged.title);
  merged.subHeader = coercePlainString(merged.subHeader);
  merged.overview = coerceMultilineText(merged.overview);
  merged.whatsInside = coerceMultilineText(merged.whatsInside);
  merged.isThisForYou = coerceMultilineText(merged.isThisForYou);
  merged.theGoal = coerceMultilineText(merged.theGoal);
  merged.equipment = coerceMultilineText(merged.equipment);
  merged.equipmentNote = coerceMultilineText(merged.equipmentNote);
  merged.frequencyCaption = coercePlainString(merged.frequencyCaption);
  merged.locationTag = coercePlainString(merged.locationTag);
  merged.implementationNote = coerceMultilineText(merged.implementationNote);
  merged.primaryGoal = coercePlainString(merged.primaryGoal);

  if (merged.workouts && typeof merged.workouts === "object" && !Array.isArray(merged.workouts)) {
    merged.workouts = normalizeDraftWorkoutsFromApi(merged.workouts);
  }

  if (merged.recovery && typeof merged.recovery === "object" && !Array.isArray(merged.recovery)) {
    const r = merged.recovery;
    merged.recovery = {
      ...r,
      mediaUrls: Array.isArray(r.mediaUrls) ? r.mediaUrls : [],
      pendingUploads: [],
    };
  }

  if (Array.isArray(merged.schedule)) {
    merged.schedule = normalizeScheduleRows(merged.schedule);
  }

  merged.programIntroVideoPending = null;
  merged.programPosterPending = null;
  merged.programThumbnailUrl = coercePlainString(
    raw?.thumbnail_url ??
      parsed?.programThumbnailUrl ??
      parsed?.thumbnail_url ??
      merged.programThumbnailUrl ??
      ""
  );

  if (merged.workoutsMeta && typeof merged.workoutsMeta === "object") {
    for (const L of ["A", "B", "C"]) {
      if (!merged.workoutsMeta[L] || typeof merged.workoutsMeta[L] !== "object") {
        merged.workoutsMeta[L] = { ...(merged.workoutsMeta[L] || {}), thumbnail_url: "" };
      }
      merged.workoutsMeta[L].thumbnailPending = null;
    }
  }

  return merged;
}

/** Turn API exercise docs into editor rows (name, tag, mediaUrls, optional slotKey, …). */
export function normalizeDraftWorkoutsFromApi(workouts) {
  if (!workouts || typeof workouts !== "object" || Array.isArray(workouts)) return workouts;
  const out = { ...workouts };
  for (const L of ["A", "B", "C"]) {
    const list = out[L];
    if (!Array.isArray(list)) continue;
    out[L] = list.map(apiExerciseRowToUi);
  }
  return out;
}

export function apiExerciseRowToUi(ex) {
  const emptyRow = {
    name: "",
    tag: "Large Muscle",
    thumbnail_url: "",
    thumbnailPending: null,
    mediaUrls: [],
    pendingUploads: [],
    target_sets: "",
    target_reps_range: "",
    targetMusclesText: "",
    instructionsText: "",
    role: "Primary",
    tempo: "",
    restPerExercise: "",
    alternative: "",
    notes: "",
    time_minutes: "",
    estimated_calories: "",
  };
  if (ex == null) return { ...emptyRow };
  if (typeof ex === "string") {
    const s = ex.trim();
    return { ...emptyRow, name: s };
  }
  const name = String(ex.name ?? "").trim();
  const video = String(ex.video_url ?? ex.videoUrl ?? "").trim();
  let thumb = String(ex.thumbnail_url ?? ex.thumbnailUrl ?? "").trim();
  if (thumb && (thumb === video || isVideoMediaUrlString(thumb))) thumb = "";

  const urls = [];
  if (video) urls.push(video);
  if (Array.isArray(ex.mediaUrls)) {
    for (const u of ex.mediaUrls.map(String).filter(Boolean)) {
      const s = String(u).trim();
      if (!s || s === thumb || s === video) continue;
      if (isVideoMediaUrlString(s) && !urls.includes(s)) urls.push(s);
      else if (!isImageMediaUrlString(s) && !urls.includes(s)) urls.push(s);
    }
  }
  const tagFromMuscles =
    Array.isArray(ex.target_muscles) && ex.target_muscles.length
      ? String(ex.target_muscles[0])
      : "";
  const tagFromUi = String(ex.tag ?? "").trim();
  const tag = tagFromUi || tagFromMuscles || "Large Muscle";

  /** @type {Record<string, unknown>} */
  const row = {
    name,
    tag,
    thumbnail_url: thumb,
    thumbnailPending: null,
    mediaUrls: urls.filter(Boolean),
  };

  if (ex.slotKey) row.slotKey = String(ex.slotKey);
  if (ex.target_sets != null) row.target_sets = ex.target_sets;
  if (ex.target_reps_range != null) row.target_reps_range = String(ex.target_reps_range);
  if (ex.difficulty_level) row.difficulty_level = String(ex.difficulty_level);
  if (ex.media_type) row.media_type = String(ex.media_type);

  if (typeof ex.targetMusclesText === "string") {
    row.targetMusclesText = ex.targetMusclesText;
  } else if (typeof ex.target_muscles_csv === "string") {
    row.targetMusclesText = ex.target_muscles_csv;
  } else if (Array.isArray(ex.target_muscles)) {
    row.targetMusclesText = ex.target_muscles.map(String).join(", ");
  } else {
    row.targetMusclesText = "";
  }

  if (typeof ex.instructionsText === "string") {
    row.instructionsText = ex.instructionsText;
  } else if (Array.isArray(ex.instructions)) {
    row.instructionsText = ex.instructions.map(String).join("\n");
  } else if (typeof ex.instructions === "string") {
    row.instructionsText = ex.instructions.replace(/\\n/g, "\n");
  } else {
    row.instructionsText = "";
  }

  if (ex.alternative != null) row.alternative = String(ex.alternative);
  else if (ex.alternative_exercise != null) row.alternative = String(ex.alternative_exercise);

  if (ex.role != null) row.role = String(ex.role);
  if (ex.tempo != null) row.tempo = String(ex.tempo);

  if (ex.restPerExercise != null) row.restPerExercise = String(ex.restPerExercise);
  else if (ex.rest_per_exercise != null) row.restPerExercise = String(ex.rest_per_exercise);

  if (ex.notes != null) row.notes = String(ex.notes);

  const timeRaw = ex.time_minutes ?? ex.timeMinutes ?? ex.estimated_time;
  if (timeRaw === "" || timeRaw == null) {
    row.time_minutes = "";
  } else {
    const n = Number(timeRaw);
    row.time_minutes = Number.isFinite(n) && n >= 0 ? n : "";
  }

  const calRaw = ex.estimated_calories;
  if (calRaw === "" || calRaw == null) {
    row.estimated_calories = "";
  } else {
    const n = Number(calRaw);
    row.estimated_calories = Number.isFinite(n) && n >= 0 ? n : "";
  }

  return { ...emptyRow, ...row };
}

function slugifySlotKey(segment) {
  const s = String(segment || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s.slice(0, 48) || "exercise";
}

function isVideoMediaUrlString(url) {
  return /\.(mp4|webm|ogg|mov|m4v|mkv|avi)(\?|#|$)/i.test(String(url || "").trim());
}

function isImageMediaUrlString(url) {
  return /\.(png|jpe?g|gif|webp|svg|bmp|heic|avif)(\?|#|$)/i.test(String(url || "").trim());
}

/** Legacy helper — only classifies extra mediaUrls; never treats video as thumbnail. */
function pickVideoThumbnailFromUrls(urls) {
  let video_url = "";
  let thumbnail_url = "";
  const list = Array.isArray(urls) ? urls.filter(Boolean).map(String) : [];
  for (const u of list) {
    const s = String(u).trim();
    if (!s || s.startsWith("blob:")) continue;
    if (isVideoMediaUrlString(s)) {
      if (!video_url) video_url = s;
    } else if (isImageMediaUrlString(s)) {
      if (!thumbnail_url) thumbnail_url = s;
    }
  }
  return { video_url, thumbnail_url };
}

/** Merge persisted library media into editor workouts (workouts often lack URLs). */
function mergeWorkoutsMediaFromLibrary(workouts, exerciseLibrary) {
  if (!workouts || typeof workouts !== "object" || Array.isArray(workouts)) return workouts;
  if (!exerciseLibrary || typeof exerciseLibrary !== "object") return workouts;
  const out = { ...workouts };
  for (const L of ["A", "B", "C"]) {
    const libList =
      (Array.isArray(exerciseLibrary[L]) && exerciseLibrary[L]) ||
      (Array.isArray(exerciseLibrary[`workout${L}`]) && exerciseLibrary[`workout${L}`]) ||
      [];
    const woList = Array.isArray(out[L]) ? out[L] : [];
    if (!libList.length) continue;
    out[L] = woList.map((ex, i) => {
      const slotKey = String(ex?.slotKey ?? "").trim();
      let lib = libList[i] && typeof libList[i] === "object" ? libList[i] : null;
      if (slotKey) {
        const hit = libList.find((row) => row && String(row.slotKey ?? "").trim() === slotKey);
        if (hit) lib = hit;
      }
      if (!lib) return ex;
      const ui = apiExerciseRowToUi(lib);
      const base = typeof ex === "object" && ex ? ex : {};
      return { ...base, ...ui, name: String(base.name ?? ui.name ?? "").trim() || ui.name };
    });
  }
  return out;
}

/**
 * Infer Mon→Sun cadence labels that must match exerciseLibrary keys (A/B/C/RECOVERY/REST or UPPER, …).
 */
function inferCadenceLabelsFromWeekRow(row) {
  if (!row || typeof row !== "object") {
    return Array(7).fill("REST");
  }
  /** Bro-split friendly defaults when cells use prose (“3 sets × 10”) */
  const classic = ["A", "RECOVERY", "B", "RECOVERY", "C", "REST", "REST"];
  const { sat, sun } = page2RowToSatSun(row);
  const cells = [row.mon, row.tue, row.wed, row.thu, row.fri, sat, sun];

  return cells.map((cell, dowIdx) => {
    const t = String(cell ?? "").trim();
    if (!t) return dowIdx >= 5 ? "REST" : classic[dowIdx] ?? "REST";
    if (/liss|stretch|recovery|active\s*recovery|\+\s*stretch/i.test(t)) return "RECOVERY";
    if (/^rest$/i.test(t)) return "REST";
    const one = /^[abc]$/i.exec(t)?.[0];
    if (one) return one.toUpperCase();

    const u = t.toUpperCase().replace(/\s+/g, "_");
    const canon = new Set(["UPPER", "LOWER", "FULL", "LEGS", "PUSH", "PULL", "RECOVERY", "REST"]);
    if (canon.has(u)) return u;

    const proseStrength = /\d/.test(t) && /set|rep/i.test(t);
    if (proseStrength) return classic[dowIdx] ?? "A";

    return classic[dowIdx] ?? "REST";
  });
}

function scheduleFirstWeekRow(schedule) {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;
  const byWeek = schedule.find((r) => r && Number(r.week) === 1);
  return byWeek ?? schedule[0];
}

/** Build `{ cadence: string[7], week1… }` for mobile parity (matches schedule ↔ library linking). */
function buildWeekGridPayload(page2, schedule) {
  const row = scheduleFirstWeekRow(schedule);
  const cadence = inferCadenceLabelsFromWeekRow(row);
  const out = {};
  if (cadence.length === 7) out.cadence = cadence;
  if (page2 && typeof page2 === "object" && Object.keys(page2).length > 0) {
    Object.assign(out, page2);
  }
  return out;
}

function uiExerciseToLibraryObject(ex, letter, idx, fallbackDifficulty) {
  const nameRaw = String(ex?.name ?? "").trim();
  const thumbExplicit = String(ex?.thumbnail_url ?? ex?.thumbnailUrl ?? "").trim();
  const videoExplicit = String(ex?.video_url ?? ex?.videoUrl ?? "").trim();
  const urls = Array.isArray(ex?.mediaUrls)
    ? ex.mediaUrls
        .filter(Boolean)
        .map(String)
        .filter((u) => u && !u.startsWith("blob:") && u !== thumbExplicit && u !== videoExplicit)
    : [];
  const picked = pickVideoThumbnailFromUrls(urls);
  let video_url = videoExplicit || picked.video_url;
  let thumbnail_url = thumbExplicit || picked.thumbnail_url;
  if (thumbnail_url && (thumbnail_url === video_url || isVideoMediaUrlString(thumbnail_url))) {
    thumbnail_url = thumbExplicit && !isVideoMediaUrlString(thumbExplicit) ? thumbExplicit : "";
  }
  const fromSlot = String(ex?.slotKey ?? "").trim();
  const slotKey =
    fromSlot ||
    `${slugifySlotKey(nameRaw || `${letter}_${idx}`)}_${letter}${idx + 1}`.replace(/^_/, "");

  const difficulty =
    String(ex?.difficulty_level ?? ex?.Difficulty ?? "").trim() ||
    String(fallbackDifficulty ?? "").trim() ||
    "Intermediate";

  /** @type {Record<string, unknown>} */
  const o = {
    slotKey,
    name: nameRaw || `Exercise ${letter}${idx + 1}`,
    difficulty_level: difficulty,
  };

  const musclesCsv = String(ex.targetMusclesText ?? ex.target_muscles_csv ?? "").trim();
  const musclesFromCsv = musclesCsv
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  let muscles = [];
  if (musclesFromCsv.length) {
    muscles = musclesFromCsv;
  } else if (Array.isArray(ex.target_muscles)) {
    muscles = ex.target_muscles.map(String).filter(Boolean);
  }

  const tagMuscle = String(ex?.tag ?? "").trim();
  if (muscles.length) {
    o.target_muscles = muscles;
  } else if (tagMuscle && !["Large Muscle", "Primary Strength", "Accessory", "Core"].includes(tagMuscle)) {
    o.target_muscles = [tagMuscle];
  }

  if (ex.target_sets != null && ex.target_sets !== "" && !Number.isNaN(Number(ex.target_sets))) {
    o.target_sets = Number(ex.target_sets);
  }
  if (ex.target_reps_range) o.target_reps_range = String(ex.target_reps_range);

  const instText = String(ex.instructionsText ?? "").trim();
  if (instText) {
    o.instructions = instText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } else if (Array.isArray(ex.instructions) && ex.instructions.length) {
    o.instructions = ex.instructions.map((x) => String(x));
  }

  const timeRaw = ex.time_minutes ?? ex.estimated_time;
  if (timeRaw !== "" && timeRaw != null && !Number.isNaN(Number(timeRaw))) {
    const mins = Number(timeRaw);
    if (mins >= 0) {
      o.time_minutes = mins;
      o.estimated_time = mins;
    }
  }

  const calRaw = ex.estimated_calories;
  if (calRaw !== "" && calRaw != null && !Number.isNaN(Number(calRaw))) {
    const cal = Number(calRaw);
    if (cal >= 0) o.estimated_calories = cal;
  }

  const mediaOnly = [...new Set([video_url, ...urls].filter(Boolean))];
  if (mediaOnly.length) o.mediaUrls = mediaOnly;

  if (video_url) {
    o.video_url = video_url;
    o.media_type = String(ex.media_type || ex.mediaType || "video");
    o.mediaType = o.media_type;
  }
  if (thumbnail_url && !isVideoMediaUrlString(thumbnail_url)) {
    o.thumbnail_url = thumbnail_url;
  }

  const alt = String(ex.alternative ?? ex.alternative_exercise ?? "").trim();
  if (alt) {
    o.alternative = alt;
    o.alternative_exercise = alt;
  }

  const role = String(ex.role ?? "").trim();
  if (role) o.role = role;

  const tempo = String(ex.tempo ?? "").trim();
  if (tempo) o.tempo = tempo;

  const rest = String(ex.restPerExercise ?? ex.rest_per_exercise ?? "").trim();
  if (rest) {
    o.restPerExercise = rest;
    o.rest_per_exercise = rest;
  }

  const notes = String(ex.notes ?? "").trim();
  if (notes) o.notes = notes;

  return o;
}

/** exerciseLibrary-shaped object: keyed by A/B/C (aligns with default cadence inference). */
export function workoutsToExerciseLibraryPayload(workouts, fallbackDifficulty) {
  if (!workouts || typeof workouts !== "object" || Array.isArray(workouts)) return {};
  /** @type {Record<string, unknown[]>} */
  const lib = {};

  for (const letter of ["A", "B", "C"]) {
    const list = Array.isArray(workouts[letter]) ? workouts[letter] : [];
    const objs = [];
    let libIdx = 0;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const name = String(typeof item === "string" ? item : item?.name ?? "").trim();
      if (!name) continue;
      objs.push(
        uiExerciseToLibraryObject(
          typeof item === "string" ? { name: item } : item,
          letter,
          libIdx,
          fallbackDifficulty
        )
      );
      libIdx += 1;
    }
    if (objs.length) {
      lib[letter] = objs;
      lib[`workout${letter}`] = objs;
    }
  }

  // Match schedule labels like UPPER / LOWER / FULL (mobile examples) → same lists as B / A / C.
  if (lib.B) lib.UPPER = lib.B;
  if (lib.A) lib.LOWER = lib.A;
  if (lib.C) lib.FULL = lib.C;

  return lib;
}

function recoveryUiToWireProtocol(recovery) {
  const r =
    recovery && typeof recovery === "object" && !Array.isArray(recovery)
      ? recovery
      : { lissMinutes: 20, lissPrompt: "", lissOptions: "", stretches: [] };

  const minutes =
    Number(r.lissMinutes) > 0 ? Number(r.lissMinutes) : 20;

  const options = String(r.lissOptions ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const stretchesRaw = Array.isArray(r.stretches) ? r.stretches : [];

  const stretches =
    stretchesRaw
      .map((s) => ({
        name: String(s?.name ?? "").trim(),
        detail: String(s?.detail ?? "").trim(),
      }))
      .filter((x) => x.name || x.detail);

  const persistedMedia = Array.isArray(r.mediaUrls)
    ? r.mediaUrls
        .map((u) => String(u ?? "").trim())
        .filter((u) => u && !u.startsWith("blob:"))
    : [];
  const firstHttp = persistedMedia.find((u) => /^https?:\/\//i.test(u));

  const protocol = {
    cardio: {
      durationMinutes: minutes,
      coachPrompt:
        String(r.lissPrompt ?? "").trim() || "Easy conversational pace — conversational breathing.",
      activityOptions: options.length ? options : ["Brisk walk", "Bike"],
      ...(firstHttp ? { media_url: firstHttp } : {}),
    },
    stretches: stretches.length ? stretches : [{ name: "Post-session stretch", detail: "5 min flow" }],
  };

  return protocol;
}

/** @deprecated Prefer validateFitnessProgramForSave — kept for older imports */
export function validateFitnessProgramMobilePayload(draft) {
  return validateFitnessProgramForSave(draft);
}

/** Strip workout-meta `thumbnailPending` before JSON persist. */
function sanitizeWorkoutsMetaForProgramDetail(workoutsMeta) {
  if (!workoutsMeta || typeof workoutsMeta !== "object" || Array.isArray(workoutsMeta)) {
    return workoutsMeta;
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const L of ["A", "B", "C"]) {
    const meta = workoutsMeta[L];
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
      out[L] = meta;
      continue;
    }
    const { thumbnailPending, ...rest } = meta;
    const thumb = String(rest.thumbnail_url ?? "").trim();
    out[L] = {
      ...rest,
      thumbnail_url: thumb && !thumb.startsWith("blob:") ? thumb : "",
    };
  }
  return out;
}

/** Strip exercise `pendingUploads` and blob preview URLs from persisted JSON. */
function sanitizeWorkoutsForProgramDetail(workouts) {
  if (!workouts || typeof workouts !== "object" || Array.isArray(workouts)) return workouts;
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const L of ["A", "B", "C"]) {
    const list = workouts[L];
    if (!Array.isArray(list)) {
      out[L] = list;
      continue;
    }
    out[L] = list.map((ex) => {
      if (!ex || typeof ex !== "object" || Array.isArray(ex)) return ex;
      const { pendingUploads, thumbnailPending, ...rest } = ex;
      const mediaUrls = Array.isArray(rest.mediaUrls)
        ? rest.mediaUrls.filter((u) => typeof u === "string" && u.trim() && !String(u).startsWith("blob:"))
        : [];
      const thumb = String(rest.thumbnail_url ?? "").trim();
      return {
        ...rest,
        thumbnail_url: thumb && !thumb.startsWith("blob:") ? thumb : "",
        mediaUrls,
      };
    });
  }
  return out;
}

function isVideoLikeFile(file) {
  if (!(file instanceof File)) return false;
  const t = String(file.type ?? "");
  if (t.startsWith("video/")) return true;
  const n = String(file.name ?? "").toLowerCase();
  return /\.(mp4|webm|ogg|mov|m4v|mkv|avi)$/i.test(n);
}

/** Re-fetch blob preview URLs into File objects when pendingUploads was lost (e.g. after API reload). */
async function blobUrlToFile(blobUrl, fallbackName = "upload.bin") {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  const type = blob.type || "application/octet-stream";
  let ext = ".bin";
  if (type.startsWith("video/")) ext = ".mp4";
  else if (type.startsWith("image/")) ext = ".jpg";
  else if (/\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(fallbackName)) ext = "";
  const name =
    fallbackName && !fallbackName.endsWith(".bin")
      ? fallbackName
      : `media_${Date.now()}${ext}`;
  return new File([blob], name, { type });
}

/**
 * Ensure every `blob:` in mediaUrls has a matching `pendingUploads[].file` before save.
 */
/** True when named exercises still have blob previews but no File to upload. */
export function workoutsHaveUnresolvedBlobMedia(workouts) {
  if (!workouts || typeof workouts !== "object") return false;
  for (const letter of ["A", "B", "C"]) {
    const list = Array.isArray(workouts[letter]) ? workouts[letter] : [];
    for (const row of list) {
      const name = String(row?.name ?? "").trim();
      if (!name) continue;
      const urls = Array.isArray(row?.mediaUrls) ? row.mediaUrls : [];
      const pend = Array.isArray(row?.pendingUploads) ? row.pendingUploads : [];
      for (const url of urls) {
        if (!String(url).startsWith("blob:")) continue;
        const hasFile = pend.some((p) => p?.blobUrl === url && p?.file instanceof File);
        if (!hasFile) return true;
      }
      const thumbUrl = String(row?.thumbnail_url ?? "");
      if (thumbUrl.startsWith("blob:")) {
        const tp = row?.thumbnailPending;
        if (!(tp?.file instanceof File) && tp?.blobUrl !== thumbUrl) return true;
        if (!(tp?.file instanceof File)) return true;
      }
    }
  }
  return false;
}

export async function prepareWorkoutMetaThumbnails(workoutsMeta) {
  if (!workoutsMeta || typeof workoutsMeta !== "object" || Array.isArray(workoutsMeta)) {
    return workoutsMeta;
  }
  const out = { ...workoutsMeta };
  for (const letter of ["A", "B", "C"]) {
    const meta = out[letter];
    if (!meta || typeof meta !== "object") continue;
    const cur = { ...meta };
    const blobUrl = cur.thumbnailPending?.blobUrl;
    if (cur.thumbnailPending?.file instanceof File) {
      out[letter] = cur;
      continue;
    }
    const url = String(cur.thumbnail_url ?? blobUrl ?? "");
    if (url.startsWith("blob:")) {
      try {
        const file = await blobUrlToFile(url, `workout_meta_${letter}.jpg`);
        cur.thumbnailPending = { blobUrl: url, file };
      } catch (e) {
        console.warn("Could not read workout meta thumbnail blob:", url, e);
      }
    }
    out[letter] = cur;
  }
  return out;
}

export async function prepareWorkoutsMediaUploads(workouts) {
  if (!workouts || typeof workouts !== "object" || Array.isArray(workouts)) return workouts;
  const out = { ...workouts };
  for (const letter of ["A", "B", "C"]) {
    const list = Array.isArray(workouts[letter]) ? [...workouts[letter]] : [];
    for (let idx = 0; idx < list.length; idx++) {
      const row = list[idx];
      if (!row || typeof row !== "object") continue;
      const name = String(row.name ?? "").trim();
      if (!name) continue;

      let pend = Array.isArray(row.pendingUploads)
        ? row.pendingUploads.map((p) => ({ ...p }))
        : [];
      const mediaUrls = Array.isArray(row.mediaUrls) ? row.mediaUrls : [];
      const covered = new Set(
        pend.filter((p) => p?.blobUrl).map((p) => String(p.blobUrl))
      );

      for (let bi = 0; bi < mediaUrls.length; bi++) {
        const url = String(mediaUrls[bi] ?? "");
        if (!url.startsWith("blob:")) continue;
        const existing = pend.find((p) => p?.blobUrl === url);
        if (existing?.file instanceof File) continue;
        try {
          const file = await blobUrlToFile(url, `workout_${letter}_${idx}_${bi}`);
          if (existing) existing.file = file;
          else pend.push({ blobUrl: url, file });
          covered.add(url);
        } catch (e) {
          console.warn("Could not read blob media for upload:", url, e);
        }
      }

      let thumbPend = row.thumbnailPending;
      const thumbUrl = String(row.thumbnail_url ?? thumbPend?.blobUrl ?? "");
      if (!(thumbPend?.file instanceof File) && thumbUrl.startsWith("blob:")) {
        try {
          const file = await blobUrlToFile(thumbUrl, `exercise_${letter}_${idx}_thumb.jpg`);
          thumbPend = { blobUrl: thumbUrl, file };
        } catch (e) {
          console.warn("Could not read exercise thumbnail blob:", thumbUrl, e);
        }
      }

      list[idx] = { ...row, pendingUploads: pend, thumbnailPending: thumbPend ?? row.thumbnailPending };
    }
    out[letter] = list;
  }
  return out;
}

/** Keep pending File uploads when a fresh API payload replaces the draft. */
export function mergePendingWorkoutsFromPrevious(prev, next) {
  if (!next || typeof next !== "object") return next;
  if (!prev?.workouts || !next.workouts) return next;
  const merged = { ...next, workouts: { ...next.workouts } };
  for (const letter of ["A", "B", "C"]) {
    const prevRows = Array.isArray(prev.workouts[letter]) ? prev.workouts[letter] : [];
    const nextRows = Array.isArray(next.workouts[letter]) ? [...next.workouts[letter]] : [];
    merged.workouts[letter] = nextRows.map((row, i) => {
      const prevRow = prevRows[i];
      const pend = Array.isArray(prevRow?.pendingUploads)
        ? prevRow.pendingUploads.filter((p) => p?.file instanceof File)
        : [];
      if (!pend.length) return row;
      const urls = Array.isArray(row?.mediaUrls) ? [...row.mediaUrls] : [];
      for (const p of pend) {
        if (p.blobUrl && !urls.includes(p.blobUrl)) urls.push(p.blobUrl);
      }
      return { ...row, mediaUrls: urls, pendingUploads: pend };
    });
  }
  return merged;
}

/**
 * Collect per-exercise pending files for `library_media` + `library_media_targets`
 * (paths like `A.0.thumbnail_url` — backend merges uploaded URLs into `exerciseLibrary`).
 * Uses the same compacted index as `workoutsToExerciseLibraryPayload` (skips unnamed rows).
 */
function collectWorkoutMetaMultipart(workoutsMeta) {
  /** @type {File[]} */
  const files = [];
  /** @type {string[]} */
  const targets = [];
  if (!workoutsMeta || typeof workoutsMeta !== "object") return { files, targets };
  for (const letter of ["A", "B", "C"]) {
    const meta = workoutsMeta[letter];
    const file = meta?.thumbnailPending?.file;
    if (file instanceof File) {
      files.push(file);
      targets.push(`${letter}.thumbnail_url`);
    }
  }
  return { files, targets };
}

function collectLibraryMultipart(workouts) {
  /** @type {File[]} */
  const files = [];
  /** @type {string[]} */
  const targets = [];
  const letters = ["A", "B", "C"];

  for (const letter of letters) {
    const list = Array.isArray(workouts?.[letter]) ? workouts[letter] : [];
    let libIdx = 0;
    for (let idx = 0; idx < list.length; idx++) {
      const row = list[idx];
      const name = String(row?.name ?? "").trim();
      if (!name) continue;
      const pend = Array.isArray(row?.pendingUploads) ? row.pendingUploads : [];
      const used = new Set();
      let mediaExtra = 0;

      const thumbFile = row?.thumbnailPending?.file;
      if (thumbFile instanceof File) {
        const path = `${letter}.${libIdx}.thumbnail_url`;
        used.add(path);
        files.push(thumbFile);
        targets.push(path);
      }

      // Media column = video / extra files only — never overwrite dedicated exercise thumbnail.
      for (const item of pend) {
        const file = item?.file;
        if (!(file instanceof File)) continue;
        const mime = String(file.type || item?.type || "").toLowerCase();
        const isVideo = mime.startsWith("video/") || isVideoLikeFile(file);

        let path;
        if (isVideo) {
          const videoPath = `${letter}.${libIdx}.video_url`;
          path = used.has(videoPath)
            ? `${letter}.${libIdx}.mediaUrls.${mediaExtra}`
            : videoPath;
          if (used.has(videoPath)) mediaExtra += 1;
        } else {
          path = `${letter}.${libIdx}.mediaUrls.${mediaExtra}`;
          mediaExtra += 1;
        }
        used.add(path);
        files.push(file);
        targets.push(path);
      }
      libIdx += 1;
    }
  }
  return { files, targets };
}

/** Strip recovery `pendingUploads` and blob preview URLs from persisted JSON. */
function sanitizeRecoveryForProgramDetail(recovery) {
  if (!recovery || typeof recovery !== "object" || Array.isArray(recovery)) return recovery ?? null;
  const { pendingUploads, ...rest } = recovery;
  const mediaUrls = Array.isArray(rest.mediaUrls)
    ? rest.mediaUrls.filter((u) => typeof u === "string" && u.trim() && !String(u).startsWith("blob:"))
    : [];
  return { ...rest, mediaUrls };
}

/**
 * Append program fields for add/update. Backend field names may vary; we send camelCase
 * plus a JSON blob for schedule / workouts / recovery.
 */
export function appendProgramFields(formData, payload) {
  const t = payload.title != null ? String(payload.title) : "";
  const o = payload.overview != null ? String(payload.overview) : "";
  const skill =
    payload.workoutSkillLevel != null && payload.workoutSkillLevel !== ""
      ? String(payload.workoutSkillLevel)
      : payload.level != null
        ? String(payload.level)
        : "";

  const flat = [
    // Backend-required fields (exact names)
    ["programName", t],
    ["subHeader", payload.subHeader],
    ["overview", o],
    ["workoutSkillLevel", skill],
    ["title", t],
    ["name", t],
    ["programTitle", t],
    ["sub_header", payload.subHeader],
    ["description", o],
    ["whatsInside", payload.whatsInside],
    ["whats_inside", payload.whatsInside],
    ["isThisForYou", payload.isThisForYou],
    ["is_this_for_you", payload.isThisForYou],
    ["theGoal", payload.theGoal],
    ["the_goal", payload.theGoal],
    ["level", payload.level],
    ["workout_skill_level", skill],
    ["durationWeeks", String(payload.durationWeeks ?? "")],
    ["duration_weeks", String(payload.durationWeeks ?? "")],
    ["frequencyPerWeek", String(payload.frequencyPerWeek ?? "")],
    ["frequency_per_week", String(payload.frequencyPerWeek ?? "")],
    ["avgSessionMinutes", String(payload.avgSessionMinutes ?? "")],
    ["avg_session_minutes", String(payload.avgSessionMinutes ?? "")],
    ["frequencyCaption", payload.frequencyCaption ?? ""],
    ["frequency_caption", payload.frequencyCaption ?? ""],
    ["locationTag", payload.locationTag ?? ""],
    ["location_tag", payload.locationTag ?? ""],
    ["equipment", payload.equipment ?? ""],
    ["equipmentNote", payload.equipmentNote ?? ""],
    ["equipment_note", payload.equipmentNote ?? ""],
    ["status", payload.status ?? "Active"],
    ["implementationNote", payload.implementationNote ?? ""],
    ["implementation_note", payload.implementationNote ?? ""],
    ["goalText", payload.theGoal ?? ""],
    ["goal_text", payload.theGoal ?? ""],
    ["primaryGoal", payload.primaryGoal ?? ""],
    ["primary_goal", payload.primaryGoal ?? ""],
  ];

  for (const [k, v] of flat) {
    if (v !== undefined && v !== null) formData.append(k, String(v));
  }

  const programCode = String(payload.programCode ?? payload.program_code ?? "").trim();
  if (programCode) {
    formData.append("programCode", programCode);
    formData.append("program_code", programCode);
  }

  const tagsArr = Array.isArray(payload.tags) ? payload.tags.map((x) => String(x).trim()).filter(Boolean) : [];
  if (tagsArr.length) {
    const tagsJson = JSON.stringify(tagsArr);
    formData.append("tags", tagsJson);
  }

  const minM = payload.minSessionMinutes ?? payload.min_session_minutes;
  const maxM = payload.maxSessionMinutes ?? payload.max_session_minutes;
  if (minM !== undefined && minM !== null && String(minM).trim() !== "") {
    formData.append("minSessionMinutes", String(minM));
    formData.append("min_session_minutes", String(minM));
  }
  if (maxM !== undefined && maxM !== null && String(maxM).trim() !== "") {
    formData.append("maxSessionMinutes", String(maxM));
    formData.append("max_session_minutes", String(maxM));
  }

  formData.append("isGymRequired", String(Boolean(payload.isGymRequired)));
  formData.append("is_gym_required", String(Boolean(payload.isGymRequired)));
  formData.append("isHomeFriendly", String(payload.isHomeFriendly !== false));
  formData.append("is_home_friendly", String(payload.isHomeFriendly !== false));
  formData.append("isQuickProgram", String(Boolean(payload.isQuickProgram)));
  formData.append("is_quick_program", String(Boolean(payload.isQuickProgram)));
  formData.append("isPrenatalProgram", String(Boolean(payload.isPrenatalProgram)));
  formData.append("is_prenatal_program", String(Boolean(payload.isPrenatalProgram)));

  const schedule = payload?.schedule;
  const workouts = payload?.workouts;
  const recovery = payload?.recovery;

  // Backend often uses page2/3/4 naming; build them from UI fields if missing.
  const page2 = payload?.page2 && typeof payload.page2 === "object" ? payload.page2 : scheduleArrayToPage2(schedule);
  const page3 = payload?.page3 && typeof payload.page3 === "object" ? payload.page3 : workoutsToPage3(workouts);
  const page4 = payload?.page4 && typeof payload.page4 === "object" ? payload.page4 : recoveryToPage4(recovery);

  const freqLine =
    payload.frequency != null && String(payload.frequency).trim()
      ? String(payload.frequency).trim()
      : payload.frequencyCaption != null && String(payload.frequencyCaption).trim()
        ? String(payload.frequencyCaption).trim()
        : `${payload.frequencyPerWeek ?? ""} Days/Week`.trim();

  const daysPwNum = Number(payload.frequencyPerWeek);
  const daysPw =
    Number.isFinite(daysPwNum) && daysPwNum > 0 ? String(daysPwNum) : String(payload.frequencyPerWeek ?? "");

  formData.append("frequency", freqLine || `${daysPw || "?"} Days/Week`);
  if (daysPw) {
    formData.append("daysPerWeek", daysPw);
    formData.append("days_per_week", daysPw);
  }

  /** Mobile parity: cadence ↔ exerciseLibrary keys; includes week buckets when present */
  const weekGridPayload = buildWeekGridPayload(page2, schedule);
  const exerciseLibraryPayload = workoutsToExerciseLibraryPayload(workouts, skill);
  const recoveryProtocolPayload = recoveryUiToWireProtocol(recovery);

  const weekGridStr = JSON.stringify(weekGridPayload);
  const exerciseLibraryStr = JSON.stringify(exerciseLibraryPayload);
  const recoveryProtocolStr = JSON.stringify(recoveryProtocolPayload);

  formData.append("weekGrid", weekGridStr);
  formData.append("logicGrid", weekGridStr);

  formData.append("exerciseLibrary", exerciseLibraryStr);
  formData.append("library", exerciseLibraryStr);

  formData.append("recoveryProtocol", recoveryProtocolStr);

  // Multipart uploads (curl: -F "recovery_media=@file" -F 'recovery_media_targets=["cardio.media_url"]').
  const rawPending =
    recovery && typeof recovery === "object" ? recovery.pendingUploads : null;
  const pendingFiles = Array.isArray(rawPending)
    ? rawPending.map((x) => (x?.file instanceof File ? x.file : null)).filter(Boolean)
    : [];
  if (pendingFiles.length > 0) {
    const targets = pendingFiles.map(() => "cardio.media_url");
    for (const f of pendingFiles) {
      formData.append("recovery_media", f);
    }
    formData.append("recovery_media_targets", JSON.stringify(targets));
  }

  const { files: libraryFiles, targets: libraryTargets } = collectLibraryMultipart(workouts);
  for (const f of libraryFiles) {
    formData.append("library_media", f);
  }
  if (libraryTargets.length) {
    formData.append("library_media_targets", JSON.stringify(libraryTargets));
  }

  const workoutsMetaPayload =
    payload?.workoutsMeta && typeof payload.workoutsMeta === "object"
      ? sanitizeWorkoutsMetaForProgramDetail(payload.workoutsMeta)
      : null;
  const { files: metaFiles, targets: metaTargets } = collectWorkoutMetaMultipart(
    payload?.workoutsMeta
  );
  for (const f of metaFiles) {
    formData.append("workout_meta_media", f);
  }
  if (metaTargets.length) {
    formData.append("workout_meta_media_targets", JSON.stringify(metaTargets));
  }

  const introVid = payload?.programIntroVideoPending?.file;
  if (introVid instanceof File) {
    formData.append("video", introVid);
  }
  const introPoster = payload?.programPosterPending?.file;
  if (introPoster instanceof File) {
    formData.append("media", introPoster);
  }
  const programThumbUrl = String(payload?.programThumbnailUrl ?? "").trim();
  if (programThumbUrl && !programThumbUrl.startsWith("blob:")) {
    formData.append("thumbnail_url", programThumbUrl);
  }

  /**
   * Admin “logic & engine” block (mockup additions). These travel through the
   * existing `programDetail` JSON field so the backend doesn’t need to know
   * about them yet — they round-trip on edit because apiRowToEditorDraft
   * spreads parsed JSON back onto the draft.
   */
  const adminLogicBlob = {
    missionStatement: payload?.missionStatement ?? "",
    workoutSkillType: payload?.workoutSkillType ?? "",
    workoutPreference: payload?.workoutPreference ?? "",
    phaseCount: payload?.phaseCount ?? 1,
    primaryGoals: Array.isArray(payload?.primaryGoals) ? payload.primaryGoals : [],
    equipmentList: Array.isArray(payload?.equipmentList) ? payload.equipmentList : [],
    noEquipmentRequired: Boolean(payload?.noEquipmentRequired),
    progressTracking: payload?.progressTracking ?? null,
    phaseStructure: payload?.phaseStructure ?? null,
    frequencyRules: payload?.frequencyRules ?? null,
    workoutsMeta: workoutsMetaPayload ?? payload?.workoutsMeta ?? null,
    programThumbnailUrl: programThumbUrl || payload?.programThumbnailUrl || "",
    engineSettings: payload?.engineSettings ?? null,
    recoveryBlocks: Array.isArray(payload?.recoveryBlocks) ? payload.recoveryBlocks : [],
    restDayConfig: payload?.restDayConfig ?? null,
    injuryPrevention: payload?.injuryPrevention ?? null,
    recoveryTips: Array.isArray(payload?.recoveryTips) ? payload.recoveryTips : [],
  };

  const detailBlob = {
    schedule,
    workouts: sanitizeWorkoutsForProgramDetail(workouts),
    recovery: sanitizeRecoveryForProgramDetail(recovery),
    page2,
    page3,
    page4,
    weekGrid: weekGridPayload,
    exerciseLibrary: exerciseLibraryPayload,
    recoveryProtocol: recoveryProtocolPayload,
    frequencyCaption: payload.frequencyCaption,
    equipmentNote: payload.equipmentNote,
    implementationNote: payload.implementationNote,
    ...adminLogicBlob,
  };

  // Mirror primaryGoal-style flat fields for backends that index them at top-level.
  if (adminLogicBlob.workoutSkillType) {
    formData.append("workoutSkillType", String(adminLogicBlob.workoutSkillType));
    formData.append("workout_skill_type", String(adminLogicBlob.workoutSkillType));
  }
  if (adminLogicBlob.workoutPreference) {
    formData.append("workoutPreference", String(adminLogicBlob.workoutPreference));
    formData.append("workout_preference", String(adminLogicBlob.workoutPreference));
  }
  if (adminLogicBlob.primaryGoals.length) {
    formData.append("primaryGoals", JSON.stringify(adminLogicBlob.primaryGoals));
    formData.append("primary_goals", JSON.stringify(adminLogicBlob.primaryGoals));
  }
  if (adminLogicBlob.equipmentList.length) {
    formData.append("equipmentList", JSON.stringify(adminLogicBlob.equipmentList));
    formData.append("equipment_list", JSON.stringify(adminLogicBlob.equipmentList));
  }
  formData.append("noEquipmentRequired", String(adminLogicBlob.noEquipmentRequired));

  const missionStatement = String(payload?.missionStatement ?? "").trim();
  if (missionStatement) {
    formData.append("missionStatement", missionStatement);
    formData.append("mission_statement", missionStatement);
  }

  const quickStats = {
    level: skill || String(payload.level ?? ""),
    duration: String(payload.durationWeeks ?? ""),
    frequency: String(payload.frequencyPerWeek ?? ""),
    avgSessionMinutes: Number(payload.avgSessionMinutes) || 0,
    locationTag: String(payload.locationTag ?? ""),
    necessaryEquipment: (Array.isArray(payload.equipmentList) ? payload.equipmentList : [])
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
      .slice(0, 24),
  };
  const quickStatsStr = JSON.stringify(quickStats);
  formData.append("quickStats", quickStatsStr);
  formData.append("quick_stats", quickStatsStr);

  const hasNested =
    (schedule && Array.isArray(schedule)) ||
    (workouts && typeof workouts === "object") ||
    (recovery && typeof recovery === "object") ||
    (page2 && typeof page2 === "object") ||
    (page3 && typeof page3 === "object") ||
    (page4 && typeof page4 === "object");

  if (hasNested) {
    const json = JSON.stringify(detailBlob);
    formData.append("programDetail", json);
    formData.append("program_detail", json);
  }

  // Some backends persist these pages as top-level JSON fields (wizard step metadata + week buckets).
  const page2Send =
    page2 && typeof page2 === "object" && !Array.isArray(page2)
      ? { ...page2, step: page2.step ?? "schedule", saved: true }
      : page2;
  const page3Send =
    page3 && typeof page3 === "object" && !Array.isArray(page3)
      ? { ...page3, step: page3.step ?? "library", saved: true }
      : page3;
  const page4Send =
    page4 && typeof page4 === "object" && !Array.isArray(page4)
      ? { ...page4, step: page4.step ?? "recovery", saved: true }
      : page4;

  if (page2Send && typeof page2Send === "object") formData.append("page2", JSON.stringify(page2Send));
  if (page3Send && typeof page3Send === "object") formData.append("page3", JSON.stringify(page3Send));
  if (page4Send && typeof page4Send === "object") formData.append("page4", JSON.stringify(page4Send));
}

export function extractProgramsFromListResponse(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.programs)) return data.programs;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.list)) return data.list;
  const result = data?.result ?? data?.data ?? {};
  if (Array.isArray(result)) return result;
  const raw =
    result.programs ??
    result.data ??
    result.items ??
    result.list ??
    (Array.isArray(result.rows) ? result.rows : null);
  if (Array.isArray(raw)) return raw;
  return [];
}

/** Normalize GET-one style responses from various backends */
function unwrapProgramDocument(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const inner = data.result ?? data.data ?? data.program ?? data.item;
  if (inner && typeof inner === "object" && !Array.isArray(inner) && (inner._id ?? inner.id))
    return inner;
  if (data._id ?? data.id) return data;
  return null;
}

/**
 * Load one program for view/edit when sessionStorage has no cache.
 * Tries common single-program routes, then paginated list (high limit).
 */
export async function fetchProgramRawById(id, { token, baseUrl }) {
  if (!id || !token || !baseUrl) return null;
  const base = String(baseUrl).replace(/\/$/, "");
  const baseNoApi = base.replace(/\/api$/i, "");

  const encId = encodeURIComponent(id);

  // Preferred endpoint (backend): GET /api/admin/programs/:id
  const paths = [
    `/api/admin/programs/${encId}`,
    `/api/admin/program/${encId}`,
    // Minimal backward-compat fallbacks
    `/api/admin/get-program-by-id/${encId}`,
  ];

  const headers = { token, Authorization: `Bearer ${token}` };

  for (const p of paths) {
    try {
      const urls = [`${base}${p}`, `${baseNoApi}${p}`];
      for (const url of urls) {
        const res = await axios.get(url, { headers, timeout: 30000 });
        const raw = unwrapProgramDocument(res?.data);
        if (raw && String(raw._id ?? raw.id) === String(id)) return raw;
      }
    } catch {
      /* wrong route or 404 */
    }
  }

  try {
    const res = await axios.get(`${base}/api/admin/get-all-programs`, {
      headers: { token, Authorization: `Bearer ${token}` },
      params: { page: 1, limit: 1000 },
    });
    const payload = res?.data ?? {};
    if (isAdminApiErrorPayload(payload)) return null;
    const rawList = extractProgramsFromListResponse(payload);
    return rawList.find((x) => String(x?._id ?? x?.id) === String(id)) ?? null;
  } catch {
    // Retry list endpoint without `/api` prefix if needed.
    try {
      const res = await axios.get(`${baseNoApi}/admin/get-all-programs`, {
        headers: { token, Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 1000 },
      });
      const payload = res?.data ?? {};
      if (isAdminApiErrorPayload(payload)) return null;
      const rawList = extractProgramsFromListResponse(payload);
      return rawList.find((x) => String(x?._id ?? x?.id) === String(id)) ?? null;
    } catch {
      return null;
    }
  }
}

/**
 * Delete program — backend uses POST + multer for some routes; API returns HTTP 200 even on errors
 * (check JSON success / statusCode). Retries until a real success or runs out of strategies.
 */
export async function deleteProgramById(programId, { token, baseUrl }) {
  if (!programId || !token || !baseUrl) {
    throw new Error("Missing program id, token, or base URL");
  }

  const baseRaw = String(baseUrl).replace(/\/$/, "");
  const baseNoApi = baseRaw.replace(/\/api$/i, "");
  /** Same host with and without trailing `/api` (legacy env quirks) */
  const roots = [...new Set([baseRaw, baseNoApi])];

  const rawId = String(programId).trim();
  const id = encodeURIComponent(rawId);

  const headersFull = { token, Authorization: `Bearer ${token}` };
  const headersToken = { token };

  const adminDeleteUrl = (pathAfterAdmin) => {
    const b = baseRaw;
    const r = String(pathAfterAdmin).replace(/^\//, "");
    if (b.toLowerCase().endsWith("/api")) return `${b}/admin/${r}`;
    return `${b}/api/admin/${r}`;
  };

  /** Matches curl: `POST …/delete-program/<id> -H "token: …"` (no body). */
  /** @returns {Array<() => Promise<unknown>>} */
  function tokenOnlyDeleteStrategies() {
    const list = [];
    for (const suffix of [`delete-program/${rawId}`, `delete-programs/${rawId}`]) {
      const url = adminDeleteUrl(suffix);
      list.push(() =>
        axios.post(url, undefined, {
          headers: { token },
          timeout: 30000,
        })
      );
      list.push(() =>
        axios.post(url, undefined, {
          headers: headersFull,
          timeout: 30000,
        })
      );
    }
    for (const root of roots) {
      for (const suffix of [`/api/admin/delete-program/${id}`, `/api/admin/delete-programs/${id}`]) {
        const url = `${root}${suffix}`;
        list.push(() =>
          axios.post(url, undefined, {
            headers: { token },
            timeout: 30000,
          })
        );
      }
    }
    return list;
  }

  /** Ordered: likely routes first */
  /** @returns {Array<() => Promise<unknown>>} */
  function buildsForRoots(pathSuffix) {
    const list = [];
    for (const root of roots) {
      const postUrl = `${root}${pathSuffix}`;
      list.push(
        () => {
          const fd = new FormData();
          fd.append("_", "");
          return axios.post(postUrl, fd, { headers: headersFull, timeout: 30000 });
        },
        () => {
          const body = new URLSearchParams();
          body.append("_", "");
          return axios.post(postUrl, body, {
            headers: { ...headersFull, "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 30000,
          });
        },
        () => axios.post(postUrl, {}, { headers: headersFull, timeout: 30000 }),
        () => {
          const fd = new FormData();
          fd.append("_", "");
          return axios.post(postUrl, fd, { headers: headersToken, timeout: 30000 });
        }
      );
    }
    return list;
  }

  const runList = [
    ...tokenOnlyDeleteStrategies(),
    ...buildsForRoots(`/api/admin/delete-program/${id}`),
    ...buildsForRoots(`/api/admin/delete-programs/${id}`),
    ...buildsForRoots(`/api/admin/delete-program?id=${id}`),
    ...buildsForRoots(`/api/admin/delete-programs?id=${id}`),
  ];

  for (const p of [`/api/admin/delete-program`, `/api/admin/delete-programs`]) {
    for (const root of roots) {
      const postUrl = `${root}${p}`;
      for (const hdr of [headersFull, headersToken]) {
        const body = new URLSearchParams();
        body.append("_", "");
        body.append("id", rawId);
        body.append("programId", rawId);
        body.append("_id", rawId);
        runList.push(() =>
          axios.post(postUrl, body, {
            headers: { ...hdr, "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 30000,
          })
        );
        runList.push(() => {
          const fd = new FormData();
          fd.append("_", "");
          fd.append("id", rawId);
          fd.append("programId", rawId);
          return axios.post(postUrl, fd, { headers: hdr, timeout: 30000 });
        });
      }
    }
  }

  let lastNetworkErr;
  let lastErrorPayload;

  for (const run of runList) {
    try {
      const res = await run();

      const data = res?.data ?? {};

      if (!isAdminApiErrorPayload(data)) {
        return res;
      }

      if (isAdminApiAuthError(data)) {
        const err = new Error(data.message || "Unauthorized");
        err.isAuthError = true;
        err.adminPayload = data;
        throw err;
      }

      lastErrorPayload = data;
    } catch (e) {
      if (e?.isAuthError) throw e;

      const st = e?.response?.status;
      if (st === 401 || st === 403) {
        throw e;
      }
      lastNetworkErr = e;

      const pd = e?.response?.data;
      if (pd && typeof pd === "object" && !Array.isArray(pd) && isAdminApiErrorPayload(pd)) {
        lastErrorPayload = pd;
      }
    }
  }

  if (lastErrorPayload) {
    const err = new Error(
      lastErrorPayload.message || lastErrorPayload.msg || "Could not delete program"
    );
    err.adminPayload = lastErrorPayload;
    throw err;
  }

  const netMsg =
    lastNetworkErr?.response?.data?.message ||
    lastNetworkErr?.response?.data?.error ||
    (typeof lastNetworkErr?.response?.data === "string" ? lastNetworkErr.response.data : null) ||
    lastNetworkErr?.message;
  throw new Error(netMsg || "Could not delete program (use a MongoDB program id from the API list).");
}

export function extractListMeta(data) {
  const result = data?.result ?? data?.data ?? {};
  const total = result.total ?? result.count ?? result.totalCount;
  const totalPages = result.totalPages ?? result.pages;
  return {
    total: typeof total === "number" ? total : undefined,
    totalPages: typeof totalPages === "number" ? totalPages : undefined,
  };
}
