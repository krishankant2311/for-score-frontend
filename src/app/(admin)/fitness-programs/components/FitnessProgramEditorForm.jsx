"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineClipboardList,
  HiOutlineChartBar,
  HiOutlineCalendar,
  HiOutlineCog,
  HiOutlineSparkles,
  HiOutlinePlus,
  HiOutlineLightBulb,
  HiOutlineShieldCheck,
  HiOutlineTag,
} from "react-icons/hi";
import { FaHeartbeat, FaLeaf } from "react-icons/fa";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  validateScheduleTab,
  validateWorkoutsTab,
  validateWorkoutBlockBeforeAddExercise,
  validateRecoveryBlockBeforeAddStretch,
  EXERCISE_TAG_OPTIONS,
  MAX_EXERCISE_NAME_LEN,
  MAX_EXERCISE_SETS,
  MAX_REP_RANGE_LEN,
  MAX_EXERCISE_CALORIES,
  MAX_EXERCISE_TIME_MINUTES,
  MAX_INSTRUCTIONS_LEN,
  clampExerciseName,
  clampExerciseSets,
  clampRepRangeInput,
  clampExerciseTimeMinutes,
  clampExerciseCalories,
  clampInstructionsText,
  clampStretchDetail,
  MAX_STRETCH_DETAIL_LEN,
  MAX_STRETCH_DURATION_MINUTES,
} from "@/lib/fitnessProgramApi";
import { FormSection, lbl, choiceChip } from "./FormSection";
import { ensureProgramLogicDefaults, createEmptyWorkoutMeta } from "../data";

/** Quick-stats / engine option lists (mirrors the admin mockup). */
const WORKOUT_SKILL_TYPE_OPTIONS = [
  "Weight Lifting",
  "HIIT",
  "Functional Movement",
  "CrossFit",
  "Prenatal / Postpartum",
  "Quickies",
  "Bodyweight / Calisthenics",
];

const WORKOUT_PREFERENCE_OPTIONS = [
  "Strength",
  "Endurance",
  "Weight Loss",
  "General Fitness",
  "Flexibility",
  "Any",
];

const PRIMARY_GOAL_OPTIONS = [
  "Weight Loss",
  "Muscle Building",
  "General Fitness",
  "Strength",
  "Endurance",
  "Mobility",
  "Physique",
  "Prenatal / Postpartum",
  "Athletic Performance",
  "Habit Building",
];

const PRIMARY_METRIC_OPTIONS = [
  "Sets × Reps progression",
  "Total volume (sets × reps × weight)",
  "Total reps (no weight)",
  "Time / AMRAP rounds",
  "Quality score (1–10)",
  "Steps / daily habit",
  "Photo check-in",
];

const SECONDARY_METRIC_OPTIONS = [
  "Bodyweight",
  "Daily steps",
  "RPE (1–10)",
  "Personal bests (PBs)",
  "Posing / photos",
];

const PHASE_TRANSITION_OPTIONS = [
  "At week number (fixed)",
  "On user action (manual)",
  "Date-based (e.g. due date)",
  "N/A — no phases",
];

const PHASE_NOTIFICATION_OPTIONS = ["Push notification", "In-app banner", "Both"];

const WORKOUT_FORMAT_OPTIONS = [
  "Standard sets",
  "Circuit / rounds",
  "Superset pairs",
  "EMOM",
  "AMRAP",
  "For time",
  "Ladder",
];

const EXERCISE_ROLE_OPTIONS = ["Primary", "Accessory", "Core", "Superset"];

const TIMER_TYPE_OPTIONS = [
  "Countdown (AMRAP)",
  "Stopwatch (for time)",
  "EMOM interval",
  "Tempo visualizer",
  "LISS duration",
];

const UI_FEATURE_OPTIONS = [
  "Form check prompts",
  "Rep counter",
  "Supine safety swap",
  "Equipment toggle (DB / Bands)",
  "Scoring / leaderboard",
];

const RECOVERY_BLOCK_TYPES = [
  "LISS Cardio",
  "Mobility Flow",
  "Breathwork",
  "Custom",
];

const RECOVERY_BLOCK_FORMATS = [
  "Single circuit",
  "Multiple rounds",
  "Flow sequence (no reps)",
  "EMOM",
  "Static holds",
];

const RECOVERY_BLOCK_DAYS = [
  "Recovery day",
  "Any day",
  "Mon only",
  "Wed only",
  "Sat only",
  "Wed & Sat",
];

const REST_DAY_TYPES = [
  "Full rest (no activity)",
  "Active rest (light walk / stretch)",
  "Outdoor activity (hike, bike)",
  "Deep recovery (tissue work, contrast shower)",
];

const TIP_DAY_OPTIONS = ["Any recovery day", "Mon tip", "Tue tip", "Wed tip", "Thu tip", "Fri tip", "Sat tip", "Sun tip"];

/** Required field marker (save validation must stay in sync). */
function ReqMark() {
  return <span className="text-red-500 font-semibold" aria-hidden="true">*</span>;
}

/** Blob URLs have no extension; some browsers leave `file.type` empty on Windows. */
function recoveryMediaDisplayKind(url, preview) {
  const mime = String(preview?.type ?? "");
  const name = String(preview?.name ?? "").toLowerCase();
  const u = String(url ?? "");
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  if (/\.(mp4|webm|ogg|mov|m4v|mkv|avi)(\?|#|$)/i.test(u)) return "video";
  if (/\.(mp4|webm|ogg|mov|m4v|mkv|avi)$/i.test(name)) return "video";
  if (/\.(png|jpe?g|gif|webp|svg|bmp|heic|avif)(\?|#|$)/i.test(u)) return "image";
  if (/\.(png|jpe?g|gif|webp|svg|bmp|heic|avif)$/i.test(name)) return "image";
  if (u.startsWith("blob:")) {
    if (/\.(mp4|webm|ogg|mov|m4v|mkv|avi)$/i.test(name)) return "video";
    return "blob";
  }
  return "unknown";
}

/** Admin editor for fitness programs — Foundations template structure. */
/** Tab labels mirror the Foundations template section names. */
const TABS = [
  { id: "overview", label: "Copy & quick stats" },
  { id: "schedule", label: "Part 1 · Logic grid" },
  { id: "workouts", label: "Part 2 · Library" },
  { id: "recovery", label: "Part 3 · Recovery" },
];

/** One-line hint per wizard step (add program) */
const STEP_HINTS = [
  "Title, overview, bullets, goal & quick stats.",
  "Fill the week × day grid (Mon–Sun).",
  "Exercises for Workout A, B & C with tags.",
  "LISS + stretches + developer note — then save.",
];

const TAB_IDS = TABS.map((t) => t.id);

function tabIndex(id) {
  return TAB_IDS.indexOf(id);
}

const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];
const TAG_OPTIONS = EXERCISE_TAG_OPTIONS;

function createEmptyWorkoutExercise() {
  return {
    name: "",
    tag: "Large Muscle",
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
    thumbnail_url: "",
    /** `{ blobUrl, file }` — maps to `library_media` target `{letter}.{idx}.thumbnail_url` */
    thumbnailPending: null,
    mediaUrls: [],
    /** `{ blobUrl, file }[]` — video / extra images via `library_media` */
    pendingUploads: [],
  };
}

/** After removing a row, keep `${letter}-${rowIndex}` aligned with `draft.workouts[letter]`. */
function remapWorkoutMediaKeysAfterRowRemove(prev, letter, removedIndex, oldLength) {
  if (!prev) return prev;
  const snapshot = prev;
  const next = { ...prev };
  for (let j = 0; j < oldLength; j++) {
    delete next[`${letter}-${j}`];
  }
  for (let newIdx = 0; newIdx < oldLength - 1; newIdx++) {
    const oldIdx = newIdx < removedIndex ? newIdx : newIdx + 1;
    const ok = `${letter}-${oldIdx}`;
    if (snapshot[ok]?.length) {
      next[`${letter}-${newIdx}`] = snapshot[ok];
    }
  }
  for (const p of snapshot[`${letter}-${removedIndex}`] ?? []) {
    try {
      if (p?.url?.startsWith("blob:")) URL.revokeObjectURL(p.url);
    } catch {
      /* ignore */
    }
  }
  return next;
}

function tabBtn(active, locked) {
  if (locked) {
    return "flex-shrink-0 rounded-lg px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap opacity-45 cursor-not-allowed text-[#94a3b8] border border-transparent";
  }
  return `flex-shrink-0 rounded-lg px-3 sm:px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
    active
      ? "bg-white text-[#0A3161] shadow-sm border border-[#C8D7E9]"
      : "text-[#2158A3] border border-transparent hover:bg-white/70"
  }`;
}

function validateOverviewStep(d) {
  if (!d?.title?.trim() || !d?.subHeader?.trim() || !d?.overview?.trim()) {
    return "Program name, Sub-header, and Overview are required.";
  }
  if (!d?.level?.trim()) {
    return "Level is required.";
  }
  const w = Number(d.durationWeeks);
  const f = Number(d.frequencyPerWeek);
  const a = Number(d.avgSessionMinutes);
  if (Number.isNaN(w) || w < 1 || Number.isNaN(f) || f < 1 || Number.isNaN(a) || a < 1) {
    return "Enter valid duration, days per week, and avg. session (numbers ≥ 1).";
  }
  if (!String(d.frequencyCaption ?? "").trim()) {
    return "Frequency (single line for the app) is required.";
  }
  return null;
}

/** Part 1 must have at least one cell before Next (see validateFitnessProgramForSave). */
function validateScheduleStep(d) {
  return validateScheduleTab(d);
}

function validateWorkoutsStep(workouts) {
  return validateWorkoutsTab(workouts);
}

export default function FitnessProgramEditorForm({
  draft,
  setDraft,
  isSaving,
  onCancel,
  onSave,
  saveLabel = "Save",
  /** Add-program flow: Overview → Schedule → Workouts → Recovery in order */
  wizardMode = false,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  /** Highest tab index (0–3) the user may open; unlocked by Next */
  const [furthestStep, setFurthestStep] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const currentIdx = tabIndex(activeTab);

  // Local-only previews for uploaded media (images / gifs / video).
  // We keep actual persisted values in draft.recovery.mediaUrls (string[]),
  // while preview URLs are stored only in component state.
  const [recoveryMediaPreviews, setRecoveryMediaPreviews] = useState([]);

  // Per-exercise media previews (A1/A2/...). Persisted URLs live on each exercise row: draft.workouts[letter][i].mediaUrls
  // Preview metadata (type/name) is kept only in component state keyed by `${letter}-${i}`.
  const [workoutRowMediaPreviews, setWorkoutRowMediaPreviews] = useState({});
  const [stretchDeleteTarget, setStretchDeleteTarget] = useState(null);

  useEffect(() => {
    return () => {
      // Revoke blob URLs on unmount.
      for (const p of recoveryMediaPreviews) {
        try {
          if (p?.url?.startsWith("blob:")) URL.revokeObjectURL(p.url);
        } catch {
          /* ignore */
        }
      }
      for (const key of Object.keys(workoutRowMediaPreviews ?? {})) {
        for (const p of workoutRowMediaPreviews?.[key] ?? []) {
          try {
            if (p?.url?.startsWith("blob:")) URL.revokeObjectURL(p.url);
          } catch {
            /* ignore */
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Clear the "advance" latch once the UI has moved.
    if (isAdvancing) setIsAdvancing(false);
    // Ensure each step opens from top when switching tabs.
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const goToTab = (id) => {
    const idx = tabIndex(id);
    if (idx < 0) return;
    if (wizardMode && idx > furthestStep) {
      toast.error("Complete the current step and tap “Next” before opening this tab.", {
        id: "fitness-program-wizard-lock",
      });
      return;
    }
    setActiveTab(id);
  };

  const validateCurrentAndGoNext = () => {
    if (!draft) return;
    if (isAdvancing) return;
    setIsAdvancing(true);
    const idx = currentIdx;
    let err = null;
    if (idx === 0) err = validateOverviewStep(draft);
    else if (idx === 1) err = validateScheduleStep(draft);
    else if (idx === 2) err = validateWorkoutsStep(draft?.workouts);
    if (err) {
      toast.error(err, { id: "fitness-program-wizard-next-error" });
      setIsAdvancing(false);
      return;
    }
    if (idx < TAB_IDS.length - 1) {
      const nextIdx = idx + 1;
      setFurthestStep((f) => Math.max(f, nextIdx));
      setActiveTab(TAB_IDS[nextIdx]);
    }
  };

  const goToPrevious = () => {
    if (currentIdx > 0) {
      setActiveTab(TAB_IDS[currentIdx - 1]);
    }
  };

  const nextButtonText = useMemo(() => {
    if (!wizardMode || currentIdx >= TAB_IDS.length - 1) return "Next";
    const labels = ["Next — 4-week schedule", "Next — Workouts A / B / C", "Next — Recovery"];
    return labels[currentIdx] ?? "Next";
  }, [wizardMode, currentIdx]);

  const lissOptionChips = useMemo(() => {
    if (!draft?.recovery?.lissOptions) return [];
    return draft.recovery.lissOptions
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [draft?.recovery?.lissOptions]);

  const updateScheduleCell = (weekIndex, key, value) => {
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.schedule];
      next[weekIndex] = { ...next[weekIndex], [key]: value };
      return { ...d, schedule: next };
    });
  };

  /**
   * Resize `draft.schedule` to `n` week rows (W1..Wn). Existing rows preserved
   * by week number; new rows are empty Mon–Sun.
   */
  const resizeSchedule = (d, n) => {
    if (!d) return d;
    const target = Math.max(1, Number(n) || 1);
    const cur = Array.isArray(d.schedule) ? d.schedule : [];
    const byWeek = new Map(cur.map((r) => [Number(r.week), r]));
    const rows = [];
    for (let w = 1; w <= target; w++) {
      const existing = byWeek.get(w);
      rows.push(
        existing || {
          week: w,
          mon: "",
          tue: "",
          wed: "",
          thu: "",
          fri: "",
          sat: "",
          sun: "",
        }
      );
    }
    return { ...d, schedule: rows };
  };

  /**
   * Find which phase (1-indexed) a given week belongs to. Returns null when
   * outside every phase range.
   */
  const phaseForWeek = (phases, week) => {
    if (!Array.isArray(phases)) return null;
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i] || {};
      const s = Number(p.startWeek) || 0;
      const e = Number(p.endWeek) || 0;
      if (week >= s && week <= e) return i + 1;
    }
    return null;
  };

  const PHASE_COLOR_CLASSES = [
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-sky-100 text-sky-800 border-sky-200",
    "bg-amber-100 text-amber-800 border-amber-200",
  ];

  const updateWorkoutExercise = (letter, index, field, value) => {
    setDraft((d) => {
      if (!d) return d;
      const list = [...d.workouts[letter]];
      list[index] = { ...list[index], [field]: value };
      return {
        ...d,
        workouts: { ...d.workouts, [letter]: list },
      };
    });
  };

  const addWorkoutExercise = (letter) => {
    const list = draft?.workouts?.[letter] ?? [];
    const err = validateWorkoutBlockBeforeAddExercise(list, letter);
    if (err) {
      toast.error(err, { id: "fitness-program-add-exercise" });
      return;
    }
    setDraft((d) => {
      if (!d) return d;
      const rows = [...(d.workouts?.[letter] ?? []), createEmptyWorkoutExercise()];
      return { ...d, workouts: { ...d.workouts, [letter]: rows } };
    });
  };

  const removeWorkoutExercise = (letter, index) => {
    if (!draft?.workouts?.[letter]) return;
    const list = draft.workouts[letter];
    if (list.length <= 1) {
      toast.error("Each workout block needs at least one exercise row.", {
        id: "fitness-program-workout-remove",
      });
      return;
    }
    const oldLen = list.length;
    setDraft((d) => {
      if (!d) return d;
      const rows = [...(d.workouts?.[letter] ?? [])];
      return {
        ...d,
        workouts: {
          ...d.workouts,
          [letter]: rows.filter((_, i) => i !== index),
        },
      };
    });
    setWorkoutRowMediaPreviews((prev) =>
      remapWorkoutMediaKeysAfterRowRemove(prev, letter, index, oldLen)
    );
  };

  const updateStretch = (index, field, value) => {
    const nextValue =
      field === "detail" ? clampStretchDetail(value) : field === "name" ? clampExerciseName(value) : value;
    setDraft((d) => {
      if (!d) return d;
      const stretches = [...d.recovery.stretches];
      stretches[index] = { ...stretches[index], [field]: nextValue };
      return { ...d, recovery: { ...d.recovery, stretches } };
    });
  };

  const removeStretch = (index) => {
    setDraft((d) => {
      if (!d || d.recovery.stretches.length <= 1) return d;
      const stretches = d.recovery.stretches.filter((_, i) => i !== index);
      return { ...d, recovery: { ...d.recovery, stretches } };
    });
    setStretchDeleteTarget(null);
  };

  const confirmRemoveStretch = () => {
    if (stretchDeleteTarget == null) return;
    removeStretch(stretchDeleteTarget.index);
  };

  const addStretch = () => {
    const stretches = draft?.recovery?.stretches ?? [];
    const err = validateRecoveryBlockBeforeAddStretch(stretches);
    if (err) {
      toast.error(err, { id: "fitness-program-add-stretch" });
      return;
    }
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        recovery: {
          ...d.recovery,
          stretches: [...d.recovery.stretches, { name: "", detail: "" }],
        },
      };
    });
  };

  const addRecoveryMediaUrls = (urls) => {
    const list = (urls ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);
    if (!list.length) return;
    setDraft((d) => {
      if (!d) return d;
      const existing = Array.isArray(d?.recovery?.mediaUrls) ? d.recovery.mediaUrls : [];
      const pending = Array.isArray(d?.recovery?.pendingUploads) ? d.recovery.pendingUploads : [];
      const next = Array.from(new Set([...existing, ...list]));
      return {
        ...d,
        recovery: { ...d.recovery, mediaUrls: next, pendingUploads: pending },
      };
    });
  };

  const removeRecoveryMediaAt = (idx) => {
    const removedUrl = draft?.recovery?.mediaUrls?.[idx];

    setDraft((d) => {
      if (!d) return d;
      const existing = Array.isArray(d?.recovery?.mediaUrls) ? d.recovery.mediaUrls : [];
      const next = existing.filter((_, i) => i !== idx);
      const pending = Array.isArray(d?.recovery?.pendingUploads) ? d.recovery.pendingUploads : [];
      const nextPending = pending.filter((p) => (p?.blobUrl || "") !== String(removedUrl ?? ""));
      return {
        ...d,
        recovery: { ...d.recovery, mediaUrls: next, pendingUploads: nextPending },
      };
    });

    setRecoveryMediaPreviews((prev) => {
      const list = prev ?? [];
      const match = list.find((p) => p?.url === removedUrl);
      try {
        if (match?.url?.startsWith("blob:")) URL.revokeObjectURL(match.url);
      } catch {
        /* ignore */
      }
      return list.filter((p) => p?.url !== removedUrl);
    });
  };

  const handleRecoveryMediaFiles = (fileList, inputEl) => {
    if (inputEl) inputEl.value = "";

    const files = Array.from(fileList ?? []);
    if (!files.length || !draft) return;

    const MAX_FILES = 8;
    const isAllowedMedia = (f) => {
      const t = String(f?.type ?? "");
      const name = String(f?.name ?? "").toLowerCase();
      if (t.startsWith("image/") || t.startsWith("video/")) return true;
      if (
        !t &&
        /\.(gif|jpe?g|png|webp|bmp|heic|avif|mp4|webm|ogg|mov|m4v|mkv|avi)$/i.test(name)
      )
        return true;
      return false;
    };

    const allowed = files.filter(isAllowedMedia);
    if (!allowed.length) {
      toast.error("Please select image / GIF / video files.");
      return;
    }
    if (files.length > allowed.length) {
      toast.error("Some files were skipped (images and videos only).");
    }

    const existingUrls = Array.isArray(draft.recovery?.mediaUrls) ? draft.recovery.mediaUrls : [];
    const room = MAX_FILES - existingUrls.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${MAX_FILES} recovery media files.`);
      return;
    }
    const take = allowed.slice(0, room);
    const newPreviews = take.map((f) => ({
      url: URL.createObjectURL(f),
      type: String(f.type || ""),
      name: f.name || "media",
    }));
    const newBlobUrls = newPreviews.map((p) => p.url);

    setRecoveryMediaPreviews((prev) =>
      [...(prev ?? []), ...newPreviews].slice(0, MAX_FILES)
    );

    setDraft((d) => {
      if (!d) return d;
      const urlsNow = Array.isArray(d.recovery.mediaUrls) ? d.recovery.mediaUrls : [];
      const pendNow = Array.isArray(d.recovery.pendingUploads)
        ? d.recovery.pendingUploads
        : [];
      const newPending = take.map((file, i) => ({ blobUrl: newBlobUrls[i], file }));
      return {
        ...d,
        recovery: {
          ...d.recovery,
          mediaUrls: [...urlsNow, ...newBlobUrls],
          pendingUploads: [...pendNow, ...newPending].slice(0, MAX_FILES),
        },
      };
    });
  };

  const removeWorkoutRowMediaAt = (letter, rowIndex, idx) => {
    const key = `${letter}-${rowIndex}`;
    const removedUrl = draft?.workouts?.[letter]?.[rowIndex]?.mediaUrls?.[idx];

    setDraft((d) => {
      if (!d) return d;
      const rows = [...(d.workouts?.[letter] ?? [])];
      const row = rows[rowIndex] ?? {};
      const existing = Array.isArray(row.mediaUrls) ? row.mediaUrls : [];
      const nextUrls = existing.filter((_, i) => i !== idx);
      const pending = Array.isArray(row.pendingUploads) ? row.pendingUploads : [];
      const nextPending = pending.filter((p) => (p?.blobUrl || "") !== String(removedUrl ?? ""));
      rows[rowIndex] = { ...row, mediaUrls: nextUrls, pendingUploads: nextPending };
      return { ...d, workouts: { ...d.workouts, [letter]: rows } };
    });

    setWorkoutRowMediaPreviews((prev) => {
      const removed = prev?.[key]?.[idx];
      try {
        if (removed?.url?.startsWith("blob:")) URL.revokeObjectURL(removed.url);
      } catch {
        /* ignore */
      }
      return { ...(prev ?? {}), [key]: (prev?.[key] ?? []).filter((_, i) => i !== idx) };
    });
  };

  const handleWorkoutRowMediaFiles = (letter, rowIndex, fileList) => {
    const files = Array.from(fileList ?? []);
    if (!files.length || !draft) return;

    const MAX_FILES = 8;
    const isAllowedMedia = (f) => {
      const t = String(f?.type ?? "");
      const name = String(f?.name ?? "").toLowerCase();
      if (t.startsWith("image/") || t.startsWith("video/")) return true;
      if (
        !t &&
        /\.(gif|jpe?g|png|webp|bmp|heic|avif|mp4|webm|ogg|mov|m4v|mkv|avi)$/i.test(name)
      )
        return true;
      return false;
    };

    const allowed = files.filter(isAllowedMedia).slice(0, MAX_FILES);
    if (!allowed.length) {
      toast.error("Please select image / GIF / video files.");
      return;
    }
    if (files.length > allowed.length) {
      toast.error(`Only image/video files allowed (max ${MAX_FILES}).`);
    }

    const row = draft.workouts?.[letter]?.[rowIndex] ?? {};
    const existingUrls = Array.isArray(row.mediaUrls) ? row.mediaUrls : [];
    const room = MAX_FILES - existingUrls.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${MAX_FILES} media files per exercise.`);
      return;
    }
    const take = allowed.slice(0, room);
    const previews = take.map((f) => ({
      url: URL.createObjectURL(f),
      type: String(f.type || ""),
      name: f.name || "media",
    }));
    const newBlobUrls = previews.map((p) => p.url);

    const key = `${letter}-${rowIndex}`;
    setWorkoutRowMediaPreviews((prev) => ({
      ...(prev ?? {}),
      [key]: [...(prev?.[key] ?? []), ...previews].slice(0, MAX_FILES),
    }));

    setDraft((d) => {
      if (!d) return d;
      const rows = [...(d.workouts?.[letter] ?? [])];
      const cur = rows[rowIndex] ?? {};
      const urlsNow = Array.isArray(cur.mediaUrls) ? cur.mediaUrls : [];
      const pendNow = Array.isArray(cur.pendingUploads) ? cur.pendingUploads : [];
      const newPending = take.map((file, i) => ({ blobUrl: newBlobUrls[i], file }));
      rows[rowIndex] = {
        ...cur,
        mediaUrls: [...urlsNow, ...newBlobUrls],
        pendingUploads: [...pendNow, ...newPending].slice(0, MAX_FILES),
      };
      return { ...d, workouts: { ...d.workouts, [letter]: rows } };
    });
  };

  const clearProgramIntroVideo = () => {
    setDraft((d) => {
      if (!d) return d;
      try {
        const b = d.programIntroVideoPending?.blobUrl;
        if (b?.startsWith("blob:")) URL.revokeObjectURL(b);
      } catch {
        /* ignore */
      }
      return { ...d, programIntroVideoPending: null };
    });
  };

  const handleProgramIntroVideoPick = (e) => {
    const input = e.target;
    const f = input.files?.[0];
    if (input) input.value = "";
    if (!f || !draft) return;
    const t = String(f.type || "");
    const ok =
      t.startsWith("video/") || /\.(mp4|webm|ogg|mov|m4v|mkv|avi)$/i.test(String(f.name || ""));
    if (!ok) {
      toast.error("Please choose a video file (mp4, webm, mov, …).");
      return;
    }
    setDraft((d) => {
      if (!d) return d;
      try {
        const old = d.programIntroVideoPending?.blobUrl;
        if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      } catch {
        /* ignore */
      }
      return { ...d, programIntroVideoPending: { file: f, blobUrl: URL.createObjectURL(f) } };
    });
  };

  const clearProgramPoster = () => {
    setDraft((d) => {
      if (!d) return d;
      try {
        const b = d.programPosterPending?.blobUrl;
        if (b?.startsWith("blob:")) URL.revokeObjectURL(b);
      } catch {
        /* ignore */
      }
      return { ...d, programPosterPending: null, programThumbnailUrl: "" };
    });
  };

  const handleWorkoutMetaThumbnailPick = (letter, e) => {
    const input = e.target;
    const f = input.files?.[0];
    if (input) input.value = "";
    if (!f || !draft) return;
    const t = String(f.type || "");
    const ok =
      t.startsWith("image/") || /\.(gif|jpe?g|png|webp|bmp|heic|avif)$/i.test(String(f.name || ""));
    if (!ok) {
      toast.error("Please choose an image for the workout thumbnail.");
      return;
    }
    setDraft((d) => {
      if (!d) return d;
      const meta =
        d.workoutsMeta && typeof d.workoutsMeta === "object" ? { ...d.workoutsMeta } : {};
      const cur = meta[letter] && typeof meta[letter] === "object" ? { ...meta[letter] } : createEmptyWorkoutMeta();
      try {
        const old = cur.thumbnailPending?.blobUrl;
        if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      } catch {
        /* ignore */
      }
      meta[letter] = {
        ...cur,
        thumbnailPending: { file: f, blobUrl: URL.createObjectURL(f) },
      };
      return { ...d, workoutsMeta: meta };
    });
  };

  const clearWorkoutMetaThumbnail = (letter) => {
    setDraft((d) => {
      if (!d) return d;
      const meta =
        d.workoutsMeta && typeof d.workoutsMeta === "object" ? { ...d.workoutsMeta } : {};
      const cur = meta[letter] && typeof meta[letter] === "object" ? { ...meta[letter] } : createEmptyWorkoutMeta();
      try {
        const old = cur.thumbnailPending?.blobUrl;
        if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      } catch {
        /* ignore */
      }
      meta[letter] = { ...cur, thumbnail_url: "", thumbnailPending: null };
      return { ...d, workoutsMeta: meta };
    });
  };

  const handleExerciseThumbnailPick = (letter, rowIndex, e) => {
    const input = e.target;
    const f = input.files?.[0];
    if (input) input.value = "";
    if (!f || !draft) return;
    const t = String(f.type || "");
    const ok =
      t.startsWith("image/") || /\.(gif|jpe?g|png|webp|bmp|heic|avif)$/i.test(String(f.name || ""));
    if (!ok) {
      toast.error("Please choose an image for the exercise thumbnail.");
      return;
    }
    setDraft((d) => {
      if (!d) return d;
      const rows = [...(d.workouts?.[letter] ?? [])];
      const cur = rows[rowIndex] ?? {};
      try {
        const old = cur.thumbnailPending?.blobUrl;
        if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      } catch {
        /* ignore */
      }
      rows[rowIndex] = {
        ...cur,
        thumbnailPending: { file: f, blobUrl: URL.createObjectURL(f) },
      };
      return { ...d, workouts: { ...d.workouts, [letter]: rows } };
    });
  };

  const clearExerciseThumbnail = (letter, rowIndex) => {
    setDraft((d) => {
      if (!d) return d;
      const rows = [...(d.workouts?.[letter] ?? [])];
      const cur = rows[rowIndex] ?? {};
      try {
        const old = cur.thumbnailPending?.blobUrl;
        if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      } catch {
        /* ignore */
      }
      rows[rowIndex] = { ...cur, thumbnail_url: "", thumbnailPending: null };
      return { ...d, workouts: { ...d.workouts, [letter]: rows } };
    });
  };

  const handleProgramPosterPick = (e) => {
    const input = e.target;
    const f = input.files?.[0];
    if (input) input.value = "";
    if (!f || !draft) return;
    const t = String(f.type || "");
    const ok =
      t.startsWith("image/") || /\.(gif|jpe?g|png|webp|bmp|heic|avif)$/i.test(String(f.name || ""));
    if (!ok) {
      toast.error("Please choose an image file for the poster.");
      return;
    }
    setDraft((d) => {
      if (!d) return d;
      try {
        const old = d.programPosterPending?.blobUrl;
        if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      } catch {
        /* ignore */
      }
      return { ...d, programPosterPending: { file: f, blobUrl: URL.createObjectURL(f) } };
    });
  };

  const ta =
    "w-full rounded-xl border border-[#C8D7E9] bg-white px-3.5 py-2.5 text-sm text-[#0A3161] outline-none focus:ring-2 focus:ring-[#0A3161]/25 resize-y";
  const inp =
    "h-12 w-full rounded-lg border border-[#C8D7E9] bg-white px-4 text-sm text-[#0A3161] shadow-none focus-visible:ring-2 focus-visible:ring-[#0A3161]/25";
  const selCls =
    "h-11 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm text-[#0A3161] outline-none focus:ring-2 focus:ring-[#0A3161]/25";

  // -----------------------------------------------------------------------
  // Admin “logic & engine” helpers (mockup additions). Each writes through
  // setDraft so the existing autosave / API mapping picks them up via
  // `programDetail` JSON blob (no backend changes required).
  // -----------------------------------------------------------------------

  const setLogicField = (key, value) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const setLogicNested = (group, key, value) => {
    setDraft((d) => {
      if (!d) return d;
      const cur = d[group] && typeof d[group] === "object" ? d[group] : {};
      return { ...d, [group]: { ...cur, [key]: value } };
    });
  };

  const togglePrimaryGoal = (goal) => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.primaryGoals) ? d.primaryGoals : [];
      const next = list.includes(goal) ? list.filter((g) => g !== goal) : [...list, goal];
      return { ...d, primaryGoals: next };
    });
  };

  const toggleEngineOption = (group, opt) => {
    setDraft((d) => {
      if (!d) return d;
      const eng =
        d.engineSettings && typeof d.engineSettings === "object"
          ? d.engineSettings
          : { timerTypes: [], uiFeatures: [] };
      const list = Array.isArray(eng[group]) ? eng[group] : [];
      const next = list.includes(opt) ? list.filter((x) => x !== opt) : [...list, opt];
      return { ...d, engineSettings: { ...eng, [group]: next } };
    });
  };

  // --- Equipment list (parallel to free-text equipment) -------------------
  const addEquipmentItem = () => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.equipmentList) ? d.equipmentList : [];
      return { ...d, equipmentList: [...list, ""] };
    });
  };

  const updateEquipmentItem = (i, value) => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.equipmentList) ? [...d.equipmentList] : [];
      list[i] = value;
      return { ...d, equipmentList: list };
    });
  };

  const removeEquipmentItem = (i) => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.equipmentList) ? d.equipmentList : [];
      return { ...d, equipmentList: list.filter((_, idx) => idx !== i) };
    });
  };

  // --- Phase / block structure -------------------------------------------
  /**
   * Picking 1/2/3 phases rebuilds the phase rows AND grows the schedule grid
   * + durationWeeks so the user sees `phaseCount × 4` week rows by default
   * (e.g. 3 phases → 12 weeks). Existing per-week cells survive the resize.
   */
  const updatePhaseCount = (n) => {
    const count = Math.max(1, Math.min(3, Number(n) || 1));
    setDraft((d) => {
      if (!d) return d;
      const ps =
        d.phaseStructure && typeof d.phaseStructure === "object"
          ? d.phaseStructure
          : { phases: [] };
      const prevPhases = Array.isArray(ps.phases) ? ps.phases : [];
      const defaults = [
        { name: "Foundation & Volume", goal: "" },
        { name: "Intensification & Peak", goal: "" },
        { name: "The Reveal", goal: "" },
      ];

      // Block size = 4 weeks per phase by default; total = count × 4.
      const blockSize = 4;
      const totalWeeks = count * blockSize;

      const next = [];
      for (let i = 0; i < count; i++) {
        const start = i * blockSize + 1;
        const end = (i + 1) * blockSize;
        next.push({
          ...defaults[i],
          ...(prevPhases[i] || {}),
          // Force-recompute ranges when count changes so they stay consistent.
          startWeek: start,
          endWeek: end,
          restPeriod: prevPhases[i]?.restPeriod ?? "",
        });
      }

      const grown = resizeSchedule(d, totalWeeks);
      return {
        ...grown,
        durationWeeks: totalWeeks,
        phaseCount: count,
        phaseStructure: { ...ps, phases: next },
      };
    });
  };

  /**
   * When a phase row’s end week is edited beyond the current durationWeeks,
   * expand the schedule grid to fit.
   */
  const updatePhaseRow = (i, key, value) => {
    setDraft((d) => {
      if (!d) return d;
      const ps =
        d.phaseStructure && typeof d.phaseStructure === "object"
          ? d.phaseStructure
          : { phases: [] };
      const phases = Array.isArray(ps.phases) ? [...ps.phases] : [];
      phases[i] = { ...(phases[i] || {}), [key]: value };

      const maxEnd = phases.reduce(
        (m, p) => Math.max(m, Number(p?.endWeek) || 0),
        0
      );

      let nextDraft = { ...d, phaseStructure: { ...ps, phases } };
      if (maxEnd > (Number(d.durationWeeks) || 0)) {
        nextDraft = resizeSchedule(nextDraft, maxEnd);
        nextDraft.durationWeeks = maxEnd;
      }
      return nextDraft;
    });
  };

  // --- Per-workout meta + progressive overload grid ----------------------
  const updateWorkoutMeta = (letter, key, value) => {
    setDraft((d) => {
      if (!d) return d;
      const meta =
        d.workoutsMeta && typeof d.workoutsMeta === "object"
          ? d.workoutsMeta
          : { A: createEmptyWorkoutMeta(), B: createEmptyWorkoutMeta(), C: createEmptyWorkoutMeta() };
      const cur = meta[letter] || createEmptyWorkoutMeta();
      return {
        ...d,
        workoutsMeta: { ...meta, [letter]: { ...cur, [key]: value } },
      };
    });
  };

  const ensureOverloadRows = (letter, weeks) => {
    setDraft((d) => {
      if (!d) return d;
      const meta =
        d.workoutsMeta && typeof d.workoutsMeta === "object" ? d.workoutsMeta : {};
      const cur = meta[letter] || createEmptyWorkoutMeta();
      const target = Math.max(1, Number(weeks) || 4);
      const next = [];
      for (let w = 1; w <= target; w++) {
        const existing = (Array.isArray(cur.overload) ? cur.overload : []).find(
          (r) => Number(r.week) === w
        );
        next.push(existing || { week: w, sets: "", reps: "", rest: "", note: "" });
      }
      return {
        ...d,
        workoutsMeta: { ...meta, [letter]: { ...cur, overload: next } },
      };
    });
  };

  const updateOverloadRow = (letter, i, key, value) => {
    setDraft((d) => {
      if (!d) return d;
      const meta =
        d.workoutsMeta && typeof d.workoutsMeta === "object" ? d.workoutsMeta : {};
      const cur = meta[letter] || createEmptyWorkoutMeta();
      const rows = Array.isArray(cur.overload) ? [...cur.overload] : [];
      rows[i] = { ...(rows[i] || {}), [key]: value };
      return {
        ...d,
        workoutsMeta: { ...meta, [letter]: { ...cur, overload: rows } },
      };
    });
  };

  // --- Recovery blocks (multi) -------------------------------------------
  const addRecoveryBlock = (type = "LISS Cardio") => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.recoveryBlocks) ? d.recoveryBlocks : [];
      return {
        ...d,
        recoveryBlocks: [
          ...list,
          {
            type,
            name: type,
            dayAssignment: "Recovery day",
            duration: "",
            intensity: "",
            modality: "",
            format: "Single circuit",
            roundsP1: "",
            roundsP2: "",
            instruction: "",
            items: [],
          },
        ],
      };
    });
  };

  const updateRecoveryBlock = (idx, key, value) => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.recoveryBlocks) ? [...d.recoveryBlocks] : [];
      list[idx] = { ...(list[idx] || {}), [key]: value };
      return { ...d, recoveryBlocks: list };
    });
  };

  const removeRecoveryBlock = (idx) => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.recoveryBlocks) ? d.recoveryBlocks : [];
      return { ...d, recoveryBlocks: list.filter((_, i) => i !== idx) };
    });
  };

  const addRecoveryBlockItem = (idx) => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.recoveryBlocks) ? [...d.recoveryBlocks] : [];
      const cur = list[idx] || {};
      const items = Array.isArray(cur.items) ? cur.items : [];
      list[idx] = { ...cur, items: [...items, { name: "", duration: "", target: "" }] };
      return { ...d, recoveryBlocks: list };
    });
  };

  const updateRecoveryBlockItem = (idx, i, key, value) => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.recoveryBlocks) ? [...d.recoveryBlocks] : [];
      const cur = list[idx] || {};
      const items = Array.isArray(cur.items) ? [...cur.items] : [];
      items[i] = { ...(items[i] || {}), [key]: value };
      list[idx] = { ...cur, items };
      return { ...d, recoveryBlocks: list };
    });
  };

  const removeRecoveryBlockItem = (idx, i) => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.recoveryBlocks) ? [...d.recoveryBlocks] : [];
      const cur = list[idx] || {};
      const items = Array.isArray(cur.items) ? cur.items : [];
      list[idx] = { ...cur, items: items.filter((_, ii) => ii !== i) };
      return { ...d, recoveryBlocks: list };
    });
  };

  // --- Recovery tips ------------------------------------------------------
  const addRecoveryTip = () => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.recoveryTips) ? d.recoveryTips : [];
      return { ...d, recoveryTips: [...list, { day: "Any recovery day", text: "" }] };
    });
  };

  const updateRecoveryTip = (i, key, value) => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.recoveryTips) ? [...d.recoveryTips] : [];
      list[i] = { ...(list[i] || {}), [key]: value };
      return { ...d, recoveryTips: list };
    });
  };

  const removeRecoveryTip = (i) => {
    setDraft((d) => {
      if (!d) return d;
      const list = Array.isArray(d.recoveryTips) ? d.recoveryTips : [];
      return { ...d, recoveryTips: list.filter((_, idx) => idx !== i) };
    });
  };

  /**
   * Hydrate the draft with safe defaults for the admin “logic & engine”
   * additions (mockup). Runs once per draft id so old API drafts pick up the
   * new fields without overwriting saved values.
   */
  useEffect(() => {
    if (!draft || !setDraft) return;
    if (draft.__logicDefaultsApplied) return;
    setDraft((d) => {
      if (!d || d.__logicDefaultsApplied) return d;
      const next = ensureProgramLogicDefaults(d);
      next.__logicDefaultsApplied = true;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  if (!draft) return null;

  return (
    <div className="w-full min-w-0" autoComplete="off">
      {wizardMode && (
        <div className="mt-6 w-full min-w-0 overflow-hidden rounded-2xl border border-[#C8D7E9] bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 border-b border-[#E8EEF4] bg-[#FAFCFF]/80">
            <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-[13px] text-[#5671A6]">
              {[
                "Copy & stats",
                "Schedule",
                "Workouts",
                "Recovery",
              ].map((label, i) => (
                <li key={label} className="flex items-center">
                  <span
                    className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full text-xs font-bold ${
                      i === currentIdx
                        ? "bg-[#0A3161] text-white ring-2 ring-[#0A3161]/20"
                        : i < currentIdx
                          ? "bg-emerald-500/15 text-emerald-800"
                          : "bg-[#E8EEF4] text-[#94a3b8]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`ml-2 mr-1 max-[380px]:max-w-[76px] max-[380px]:truncate sm:max-w-none ${
                      i === currentIdx ? "font-semibold text-[#0A3161]" : ""
                    }`}
                  >
                    {label}
                  </span>
                  {i < 3 && <span className="mx-1 text-[#C8D7E9] hidden sm:inline">→</span>}
                </li>
              ))}
            </ol>
          </div>
          <div className="px-4 py-3 sm:px-5">
            <p className="text-sm text-[#2158A3]">
              <span className="font-semibold text-[#0A3161]">Step {currentIdx + 1} of 4</span>
              <span className="text-[#5671A6]"> — {STEP_HINTS[currentIdx]}</span>
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 rounded-xl border border-[#C8D7E9] bg-[#F2F5FA] p-2">
        {TABS.map((t, i) => {
          const locked = wizardMode && i > furthestStep;
          const tabTitles = [
            "Program copy & quick stats",
            "Part 1 — 4-week schedule grid",
            "Part 2 — Workouts A, B, C",
            "Part 3 — Recovery + implementation note",
          ];
          return (
            <button
              key={t.id}
              type="button"
              title={locked ? "Complete the previous step with Next first" : tabTitles[i]}
              onClick={() => goToTab(t.id)}
              disabled={locked}
              className={`${tabBtn(activeTab === t.id, locked)} shrink-0 mb-1`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 w-full min-w-0 overflow-hidden rounded-2xl border border-[#C8D7E9] bg-white shadow-md">
        <div className="min-h-[280px] bg-[linear-gradient(180deg,#FAFCFF_0%,#FFFFFF_35%)] p-4 sm:p-6 md:p-8">
          {activeTab === "overview" && (
            <div className="">
              <div className="space-y-6">
              <FormSection
                title="Program Title & Sub-header"
                hint="Title line and sub-header shown under the program name on the program card."
                icon={<HiOutlineDocumentText />}
                tone="sky"
              >
                <div>
                  <label className={lbl}>
                    Program Title <span className="text-red-500 normal-case">*</span>
                  </label>
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className={`mt-1.5 ${inp}`}
                    placeholder="e.g. 28-Day Full Body Foundations"
                  />
                </div>
                <div>
                  <label className={lbl}>
                    Sub-header <span className="text-red-500 normal-case">*</span>
                  </label>
                  <Input
                    value={draft.subHeader}
                    onChange={(e) => setDraft({ ...draft, subHeader: e.target.value })}
                    className={`mt-1.5 ${inp}`}
                    placeholder="e.g. Build your base. Master the moves. Start your journey."
                  />
                </div>
              </FormSection>

              <FormSection
                title="The Overview"
                hint="Main intro paragraph(s) for the program overview."
                icon={<HiOutlineDocumentText />}
                tone="sky"
              >
                <div>
                  <label className={lbl}>
                    Body copy <span className="text-red-500 normal-case">*</span>
                  </label>
                  <textarea
                    rows={6}
                    name="program-overview-body"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck
                    value={draft.overview}
                    onChange={(e) => setDraft({ ...draft, overview: e.target.value })}
                    className={`mt-1.5 ${ta} min-h-[140px]`}
                    placeholder="Ready to start your fitness journey but not sure where to begin? …"
                  />
                </div>
              </FormSection>

              <FormSection
                title="What’s Inside"
                hint="Bullet list — one line per bullet (use ● or plain lines)."
                icon={<HiOutlineClipboardList />}
                tone="violet"
              >
                <textarea
                  rows={4}
                  value={draft.whatsInside}
                  onChange={(e) => setDraft({ ...draft, whatsInside: e.target.value })}
                  className={ta}
                  placeholder={"● 3 Strength Days: …\n● 2 Active Recovery Days: …"}
                />
              </FormSection>

              <FormSection
                title="Is This For You?"
                hint="Audience bullets — who this program is for."
                icon={<HiOutlineClipboardList />}
                tone="violet"
              >
                <textarea
                  rows={4}
                  value={draft.isThisForYou}
                  onChange={(e) => setDraft({ ...draft, isThisForYou: e.target.value })}
                  className={ta}
                  placeholder="● New to the gym? …"
                />
              </FormSection>

              <FormSection
                title="The Goal"
                hint="Closing outcome paragraph — what the user achieves."
                icon={<HiOutlineClipboardList />}
                tone="violet"
              >
                <textarea
                  rows={3}
                  value={draft.theGoal}
                  onChange={(e) => setDraft({ ...draft, theGoal: e.target.value })}
                  className={ta}
                  placeholder="By the end of the program…"
                />
              </FormSection>

              <FormSection
                title="Quick Stats for the App UI"
                hint="Level, Duration, Frequency, Avg. Session, Location Tag, Necessary Equipment, Note — plus admin Status."
                icon={<HiOutlineChartBar />}
                tone="emerald"
              >
                <div>
                  <label className={lbl}>Primary goal</label>
                  <p className="text-xs text-[#5671A6] mt-0.5 mb-1">
                    Short badge for APIs & program cards (e.g. Strength, Fat loss).
                  </p>
                  <Input
                    value={draft.primaryGoal ?? ""}
                    onChange={(e) => setDraft({ ...draft, primaryGoal: e.target.value })}
                    className="mt-1.5 h-11 rounded-lg border-[#C8D7E9]"
                    placeholder="e.g. Strength"
                  />
                </div>
                <div>
                  <label className={lbl}>
                    Level (workout skill level) <span className="text-red-500 normal-case">*</span>
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LEVEL_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={choiceChip(draft.level === opt)}
                        onClick={() => setDraft({ ...draft, level: opt })}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={lbl}>
                      Duration <ReqMark />
                    </label>
                    <p className="text-xs text-[#5671A6] mt-0.5 mb-1">Weeks (e.g. 4 Weeks)</p>
                    <Input
                      type="number"
                      min={1}
                      value={draft.durationWeeks}
                      onChange={(e) => {
                        const w = Math.max(1, Number(e.target.value) || 1);
                        setDraft((d) => (d ? resizeSchedule({ ...d, durationWeeks: w }, w) : d));
                      }}
                      className="mt-1.5 h-11 rounded-lg border-[#C8D7E9]"
                    />
                  </div>
                  <div>
                    <label className={lbl}>
                      Days / week (numeric) <ReqMark />
                    </label>
                    <p className="text-xs text-[#5671A6] mt-0.5 mb-1">For filters; pair with Frequency line below.</p>
                    <Input
                      type="number"
                      min={1}
                      value={draft.frequencyPerWeek}
                      onChange={(e) => setDraft({ ...draft, frequencyPerWeek: Number(e.target.value) || 1 })}
                      className="mt-1.5 h-11 rounded-lg border-[#C8D7E9]"
                    />
                  </div>
                  <div>
                    <label className={lbl}>
                      Avg. Session <ReqMark />
                    </label>
                    <p className="text-xs text-[#5671A6] mt-0.5 mb-1">Minutes (e.g. 35 Minutes)</p>
                    <Input
                      type="number"
                      min={1}
                      value={draft.avgSessionMinutes}
                      onChange={(e) => setDraft({ ...draft, avgSessionMinutes: Number(e.target.value) || 1 })}
                      className="mt-1.5 h-11 rounded-lg border-[#C8D7E9]"
                    />
                  </div>
                </div>
                <div>
                  <label className={lbl}>
                    Frequency <ReqMark />
                  </label>
                  <p className="text-xs text-[#5671A6] mt-0.5 mb-1">
                    Single line for the app (e.g. “5 Days/Week (3 Strength, 2 Recovery)”).
                  </p>
                  <Input
                    value={draft.frequencyCaption ?? ""}
                    onChange={(e) => setDraft({ ...draft, frequencyCaption: e.target.value })}
                    className="mt-1.5 h-11 rounded-lg border-[#C8D7E9]"
                    placeholder="5 Days/Week (3 Strength, 2 Recovery)"
                  />
                </div>
                <div>
                  <label className={lbl}>Location Tag</label>
                  <p className="text-xs text-[#5671A6] mt-0.5 mb-1">e.g. “Workout From Home (Friendly)”</p>
                  <Input
                    value={draft.locationTag}
                    onChange={(e) => setDraft({ ...draft, locationTag: e.target.value })}
                    className={`mt-1.5 h-11 rounded-lg border border-[#C8D7E9]`}
                    placeholder="🏠 Workout From Home (Friendly)"
                  />
                </div>
                <div>
                  <label className={lbl}>Necessary equipment</label>
                  <p className="text-xs text-[#5671A6] mt-0.5 mb-1">Bullet list — one item per line.</p>
                  <textarea
                    rows={4}
                    value={draft.equipment}
                    onChange={(e) => setDraft({ ...draft, equipment: e.target.value })}
                    className={ta}
                    placeholder="Bodyweight (Primary)…"
                  />
                </div>
                <div>
                  <label className={lbl}>Note</label>
                  <p className="text-xs text-[#5671A6] mt-0.5 mb-1">
                    Shown under equipment (e.g. zero-barrier / no gym required).
                  </p>
                  <Input
                    value={draft.equipmentNote ?? ""}
                    onChange={(e) => setDraft({ ...draft, equipmentNote: e.target.value })}
                    className="mt-1.5 h-11 rounded-lg border-[#C8D7E9]"
                    placeholder="No gym membership required…"
                  />
                </div>
                <div>
                  <label className={lbl}>Status</label>
                  <div className="mt-2 flex w-full min-w-0 flex-wrap gap-2">
                    {["Active", "Inactive"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={choiceChip(draft.status === opt)}
                        onClick={() => setDraft({ ...draft, status: opt })}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="API catalog & media"
                hint="Optional fields sent with add-programs: programCode, tags, session bounds, flags, intro video (`video`), poster (`media`). Exercise uploads map to library_media."
                icon={<HiOutlineTag />}
                tone="slate"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Program code</label>
                    <p className="text-xs text-[#5671A6] mt-0.5 mb-1">Stable slug for deep links (e.g. complete_program_demo).</p>
                    <Input
                      value={draft.programCode ?? ""}
                      onChange={(e) => setDraft({ ...draft, programCode: e.target.value })}
                      className={`mt-1.5 ${inp}`}
                      placeholder="my_program_slug"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Tags</label>
                    <p className="text-xs text-[#5671A6] mt-0.5 mb-1">Comma-separated — sent as JSON array.</p>
                    <Input
                      value={Array.isArray(draft.tags) ? draft.tags.join(", ") : ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          tags: e.target.value
                            .split(/[,;]/)
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className={`mt-1.5 ${inp}`}
                      placeholder="strength, hypertrophy, demo"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Min session (minutes)</label>
                    <Input
                      type="number"
                      min={1}
                      value={draft.minSessionMinutes ?? ""}
                      onChange={(e) => setDraft({ ...draft, minSessionMinutes: e.target.value })}
                      className={`mt-1.5 ${inp}`}
                      placeholder="40"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Max session (minutes)</label>
                    <Input
                      type="number"
                      min={1}
                      value={draft.maxSessionMinutes ?? ""}
                      onChange={(e) => setDraft({ ...draft, maxSessionMinutes: e.target.value })}
                      className={`mt-1.5 ${inp}`}
                      placeholder="65"
                    />
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#C8D7E9] bg-[#FAFCFF] px-3 py-2 text-sm text-[#0A3161]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#0A3161]"
                      checked={Boolean(draft.isGymRequired)}
                      onChange={(e) => setDraft({ ...draft, isGymRequired: e.target.checked })}
                    />
                    Gym required
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#C8D7E9] bg-[#FAFCFF] px-3 py-2 text-sm text-[#0A3161]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#0A3161]"
                      checked={draft.isHomeFriendly !== false}
                      onChange={(e) => setDraft({ ...draft, isHomeFriendly: e.target.checked })}
                    />
                    Home-friendly
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#C8D7E9] bg-[#FAFCFF] px-3 py-2 text-sm text-[#0A3161]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#0A3161]"
                      checked={Boolean(draft.isQuickProgram)}
                      onChange={(e) => setDraft({ ...draft, isQuickProgram: e.target.checked })}
                    />
                    Quick program
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#C8D7E9] bg-[#FAFCFF] px-3 py-2 text-sm text-[#0A3161]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#0A3161]"
                      checked={Boolean(draft.isPrenatalProgram)}
                      onChange={(e) => setDraft({ ...draft, isPrenatalProgram: e.target.checked })}
                    />
                    Prenatal program
                  </label>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Intro video (multipart field: video)</label>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        accept="video/*"
                        className="max-w-full text-xs text-[#2158A3] file:mr-2 file:rounded-lg file:border-0 file:bg-[#0A3161] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                        onChange={handleProgramIntroVideoPick}
                      />
                      {draft.programIntroVideoPending?.file ? (
                        <Button type="button" variant="outline" size="sm" onClick={clearProgramIntroVideo}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    {draft.programIntroVideoPending?.file ? (
                      <p className="mt-1 text-xs text-[#5671A6]">{draft.programIntroVideoPending.file.name}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className={lbl}>Program thumbnail (cover)</label>
                    <p className="mt-0.5 text-[10px] text-[#5671A6]">
                      Shown on the program card in the app. Saved as{" "}
                      <span className="font-mono">media</span> + <span className="font-mono">thumbnail_url</span>.
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="max-w-full text-xs text-[#2158A3] file:mr-2 file:rounded-lg file:border-0 file:bg-[#0A3161] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                        onChange={handleProgramPosterPick}
                      />
                      {draft.programPosterPending?.file || draft.programThumbnailUrl ? (
                        <Button type="button" variant="outline" size="sm" onClick={clearProgramPoster}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    {draft.programPosterPending?.file ? (
                      <p className="mt-1 text-xs text-[#5671A6]">{draft.programPosterPending.file.name}</p>
                    ) : null}
                    {draft.programPosterPending?.blobUrl || draft.programThumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={draft.programPosterPending?.blobUrl || draft.programThumbnailUrl}
                        alt="Program thumbnail preview"
                        className="mt-2 h-20 w-32 rounded-lg border border-[#DCE7F5] object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              </FormSection>

              {/* Mission statement (admin mockup) */}
              <FormSection
                title="Mission statement"
                hint='Short tagline-style mission shown on the program card (e.g. "28 days of discipline…").'
                icon={<HiOutlineSparkles />}
                tone="violet"
              >
                <textarea
                  rows={3}
                  value={draft.missionStatement ?? ""}
                  onChange={(e) => setLogicField("missionStatement", e.target.value)}
                  className={ta}
                  placeholder='"28 days of discipline. Build your base. Master the moves."'
                />
              </FormSection>

              {/* Workout matching tags */}
              <FormSection
                title="Workout type & matching"
                hint="Drives the matching engine + filter chips in the app — independent of skill level."
                icon={<HiOutlineCog />}
                tone="emerald"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={lbl}>Workout skill type</label>
                    <select
                      value={draft.workoutSkillType ?? ""}
                      onChange={(e) => setLogicField("workoutSkillType", e.target.value)}
                      className={`mt-1.5 ${selCls}`}
                    >
                      <option value="">Select type</option>
                      {WORKOUT_SKILL_TYPE_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Workout preference</label>
                    <select
                      value={draft.workoutPreference ?? ""}
                      onChange={(e) => setLogicField("workoutPreference", e.target.value)}
                      className={`mt-1.5 ${selCls}`}
                    >
                      <option value="">Select preference</option>
                      {WORKOUT_PREFERENCE_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Phase / block count</label>
                    <select
                      value={String(draft.phaseCount ?? 1)}
                      onChange={(e) => updatePhaseCount(e.target.value)}
                      className={`mt-1.5 ${selCls}`}
                    >
                      <option value="1">1 (no phases)</option>
                      <option value="2">2 phases</option>
                      <option value="3">3 phases</option>
                    </select>
                  </div>
                </div>
              </FormSection>

              {/* Primary goals — multi-select pills */}
              <FormSection
                title="Primary goals"
                hint="Select all that apply — used in the program matching engine."
                icon={<HiOutlineSparkles />}
                tone="sky"
              >
                <div className="flex flex-wrap gap-2">
                  {PRIMARY_GOAL_OPTIONS.map((g) => {
                    const selected = Array.isArray(draft.primaryGoals) && draft.primaryGoals.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => togglePrimaryGoal(g)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          selected
                            ? "border-[#0A3161] bg-[#0A3161]/10 text-[#0A3161]"
                            : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </FormSection>

              {/* Equipment list + zero-barrier toggle */}
              <FormSection
                title="Required equipment (list)"
                hint="Structured list (one item per row) — complements the free-text equipment field above."
                icon={<HiOutlineClipboardList />}
                tone="amber"
              >
                <div className="space-y-2">
                  {(Array.isArray(draft.equipmentList) ? draft.equipmentList : []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8EEF4] text-xs font-bold text-[#0A3161]">
                        {i + 1}
                      </span>
                      <Input
                        value={item}
                        onChange={(e) => updateEquipmentItem(i, e.target.value)}
                        className="h-10 flex-1 border-[#C8D7E9] bg-white rounded-lg text-sm"
                        placeholder="e.g. Yoga mat / floor space"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-[#B91C1C] hover:bg-red-50 hover:text-[#991B1B]"
                        onClick={() => removeEquipmentItem(i)}
                        aria-label="Remove item"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-[#C8D7E9] text-[#2158A3] hover:bg-[#F2F5FA]"
                    onClick={addEquipmentItem}
                  >
                    + Add item
                  </Button>
                </div>
                <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#C8D7E9] bg-[#FAFCFF] px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[#0A3161]">No equipment required</span>
                    <span className="block text-xs text-[#5671A6]">Enables the zero-barrier tag in the app.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.noEquipmentRequired)}
                    onChange={(e) => setLogicField("noEquipmentRequired", e.target.checked)}
                    className="h-5 w-5 accent-[#0A3161]"
                  />
                </label>
              </FormSection>

              {/* Progress tracking & metrics */}
              {/* <FormSection
                title="Progress tracking & metrics"
                hint="Drives in-app trackers and the leaderboard / PB / habit features."
                icon={<HiOutlineChartBar />}
                tone="emerald"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Primary tracking metric</label>
                    <select
                      value={draft?.progressTracking?.primaryMetric ?? ""}
                      onChange={(e) => setLogicNested("progressTracking", "primaryMetric", e.target.value)}
                      className={`mt-1.5 ${selCls}`}
                    >
                      <option value="">Select metric</option>
                      {PRIMARY_METRIC_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Secondary metric</label>
                    <select
                      value={draft?.progressTracking?.secondaryMetric ?? ""}
                      onChange={(e) => setLogicNested("progressTracking", "secondaryMetric", e.target.value)}
                      className={`mt-1.5 ${selCls}`}
                    >
                      <option value="">None</option>
                      {SECONDARY_METRIC_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  {[
                    {
                      key: "photoCheckIn",
                      label: "Enable photo check-in",
                      desc: "Prompts user to upload physique photos at week start.",
                    },
                    {
                      key: "leaderboard",
                      label: "Enable leaderboard / scoring",
                      desc: "For CrossFit / timed workouts — records time, reps, weight.",
                    },
                    {
                      key: "pbTracker",
                      label: "Show personal bests (PB) tracker",
                      desc: "Tracks benchmark workout performance over time.",
                    },
                    {
                      key: "habitTracker",
                      label: "Daily habit tracker",
                      desc: "Steps, water, protein check-ins (e.g. 28-Day Ignite).",
                    },
                  ].map((row) => (
                    <label
                      key={row.key}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#C8D7E9] bg-[#FAFCFF] px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[#0A3161]">{row.label}</span>
                        <span className="block text-xs text-[#5671A6]">{row.desc}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(draft?.progressTracking?.[row.key])}
                        onChange={(e) => setLogicNested("progressTracking", row.key, e.target.checked)}
                        className="h-5 w-5 accent-[#0A3161]"
                      />
                    </label>
                  ))}
                </div>
              </FormSection> */}

              {/* Developer / implementation notes (admin only) */}
              {/* <FormSection
                title="Developer / implementation notes"
                hint="Admin only — phase switching rules, safety flags, timer logic, UI prompts."
                icon={<HiOutlineDocumentText />}
                tone="slate"
              >
                <textarea
                  rows={4}
                  value={draft.implementationNote ?? ""}
                  onChange={(e) => setDraft({ ...draft, implementationNote: e.target.value })}
                  className={ta}
                  placeholder='e.g. "Sets iterate by week; exercise list constant. Phase 3 inserts a deload week."'
                />
              </FormSection> */}
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="flex flex-col gap-8 rounded-2xl bg-[#EEF2F7] p-4 sm:p-5 md:p-6 [&>section]:shadow-sm">
              {/* <p className="text-sm text-[#5671A6] mb-1 w-full max-w-none leading-relaxed">
                <span className="font-medium text-[#2158A3]">
                  Part 1: The {Number(draft.durationWeeks) || 4}-week logic grid
                </span>{" "}
                — set global rules for what the user sees each day. Saturday and Sunday are separate columns;
                the app still sends a combined <span className="font-medium text-[#2158A3]">weekend</span> string for
                older APIs when the two differ. Sets/reps iterate by week while exercise lists stay fixed for the block.
              </p> */}
              

              {/* Phase / block structure */}
              <FormSection
                className="shrink-0"
                title="Phase / block structure"
                hint="Split the program into 1–3 phases (e.g. Foundation → Intensification → Reveal). Phase data is also surfaced on the program card."
                icon={<HiOutlineSparkles />}
                tone="violet"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={lbl}>Total phases</label>
                    <select
                      value={String(draft.phaseCount ?? 1)}
                      onChange={(e) => updatePhaseCount(e.target.value)}
                      className={`mt-1.5 ${selCls}`}
                    >
                      <option value="1">1 — No phases</option>
                      <option value="2">2 phases</option>
                      <option value="3">3 phases</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Phase transition trigger</label>
                    <select
                      value={draft?.phaseStructure?.transitionTrigger ?? ""}
                      onChange={(e) => setLogicNested("phaseStructure", "transitionTrigger", e.target.value)}
                      className={`mt-1.5 ${selCls}`}
                    >
                      <option value="">Select trigger</option>
                      {PHASE_TRANSITION_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* <div>
                    <label className={lbl}>Phase change notification</label>
                    <select
                      value={draft?.phaseStructure?.changeNotification ?? ""}
                      onChange={(e) => setLogicNested("phaseStructure", "changeNotification", e.target.value)}
                      className={`mt-1.5 ${selCls}`}
                    >
                      <option value="">None</option>
                      {PHASE_NOTIFICATION_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div> */}
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-[#C8D7E9] bg-white">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow className="bg-[#F2F5FA] hover:bg-[#F2F5FA] border-b border-[#D9E8F5]">
                        <TableHead className="w-14 px-2 py-3 text-[#2158A3] font-semibold">Phase</TableHead>
                        <TableHead className="min-w-[160px] px-2 py-3 text-[#2158A3] font-semibold">Name</TableHead>
                        <TableHead className="w-24 px-2 py-3 text-[#2158A3] font-semibold">Start week</TableHead>
                        <TableHead className="w-24 px-2 py-3 text-[#2158A3] font-semibold">End week</TableHead>
                        <TableHead className="min-w-[180px] px-2 py-3 text-[#2158A3] font-semibold">Goal / focus</TableHead>
                        <TableHead className="w-32 px-2 py-3 text-[#2158A3] font-semibold">Rest period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(draft?.phaseStructure?.phases ?? []).map((p, i) => (
                        <TableRow key={i} className="border-b border-[#EEF2F7]">
                          <TableCell className="px-2 py-2 align-middle">
                            <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-[#E8EEF4] px-2 text-xs font-bold text-[#0A3161]">
                              P{i + 1}
                            </span>
                          </TableCell>
                          <TableCell className="p-2 align-middle">
                            <Input
                              value={p.name ?? ""}
                              onChange={(e) => updatePhaseRow(i, "name", e.target.value)}
                              placeholder="Phase name…"
                              className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-2 align-middle">
                            <Input
                              type="number"
                              min={1}
                              value={p.startWeek ?? ""}
                              onChange={(e) => updatePhaseRow(i, "startWeek", Number(e.target.value) || 1)}
                              className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-2 align-middle">
                            <Input
                              type="number"
                              min={1}
                              value={p.endWeek ?? ""}
                              onChange={(e) => updatePhaseRow(i, "endWeek", Number(e.target.value) || 1)}
                              className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-2 align-middle">
                            <Input
                              value={p.goal ?? ""}
                              onChange={(e) => updatePhaseRow(i, "goal", e.target.value)}
                              placeholder="Muscle size, form…"
                              className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                            />
                          </TableCell>
                          <TableCell className="p-2 align-middle">
                            <Input
                              value={p.restPeriod ?? ""}
                              onChange={(e) => updatePhaseRow(i, "restPeriod", e.target.value)}
                              placeholder="60–90s"
                              className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-2 text-xs text-[#5671A6]">
                  Progressive overload (sets/reps per week) is configured inside <span className="font-medium text-[#2158A3]">Workouts</span> per
                  exercise block.
                </p>
              </FormSection>

              {/* Frequency & rest rules */}
              <FormSection
                className="shrink-0"
                title="Frequency & rest rules"
                hint="Drive the app schedule generator and matching engine — separate from the 4-week logic grid."
                icon={<HiOutlineCalendar />}
                tone="emerald"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={lbl}>Training days / week</label>
                    <Input
                      value={draft?.frequencyRules?.trainingDaysPerWeek ?? ""}
                      onChange={(e) => setLogicNested("frequencyRules", "trainingDaysPerWeek", e.target.value)}
                      placeholder="e.g. 3, 4–5, 5–6"
                      className="mt-1.5 h-11 rounded-lg border-[#C8D7E9]"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Recovery days / week</label>
                    <Input
                      value={draft?.frequencyRules?.recoveryDaysPerWeek ?? ""}
                      onChange={(e) => setLogicNested("frequencyRules", "recoveryDaysPerWeek", e.target.value)}
                      placeholder="e.g. 2"
                      className="mt-1.5 h-11 rounded-lg border-[#C8D7E9]"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Full rest days / week</label>
                    <Input
                      value={draft?.frequencyRules?.restDaysPerWeek ?? ""}
                      onChange={(e) => setLogicNested("frequencyRules", "restDaysPerWeek", e.target.value)}
                      placeholder="e.g. 2"
                      className="mt-1.5 h-11 rounded-lg border-[#C8D7E9]"
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {[
                    {
                      key: "flexibleSchedule",
                      label: "Flexible schedule",
                      desc: "User can reschedule days (e.g. Core & Flow, Quick Hits).",
                    },
                    {
                      key: "libraryMode",
                      label: "No fixed calendar (library mode)",
                      desc: "Workouts live in a library, not a calendar (Quick Hits style).",
                    },
                  ].map((row) => (
                    <label
                      key={row.key}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#C8D7E9] bg-[#FAFCFF] px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[#0A3161]">{row.label}</span>
                        <span className="block text-xs text-[#5671A6]">{row.desc}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(draft?.frequencyRules?.[row.key])}
                        onChange={(e) => setLogicNested("frequencyRules", row.key, e.target.checked)}
                        className="h-5 w-5 accent-[#0A3161]"
                      />
                    </label>
                  ))}
                </div>
              </FormSection>

              <FormSection
                className="shrink-0"
                title={
                  <>
                    {`The ${Number(draft.durationWeeks) || 4}-Week Logic Grid${
                      Number(draft.phaseCount) > 1 ? ` · ${draft.phaseCount} phases` : ""
                    }`}{" "}
                    <ReqMark />
                  </>
                }
                hint="Each row is a week. Phase badge on the left shows which phase the week belongs to. Fill at least one day cell before continuing."
                icon={<HiOutlineCalendar />}
                tone="slate"
              >
                <p className="text-xs text-[#5671A6] mb-2">
                  Scroll horizontally on small screens. Week column stays pinned while you edit.
                </p>
                <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-[#C8D7E9] bg-white p-2 shadow-inner md:p-3">
                  <Table className="w-full min-w-[960px] xl:min-w-0">
                    <TableHeader>
                      <TableRow className="bg-[#F2F5FA] hover:bg-[#F2F5FA] border-b border-[#D9E8F5]">
                        <TableHead className="sticky left-0 z-20 w-14 min-w-[3.5rem] bg-[#F2F5FA] px-2 py-3 text-[#2158A3] font-semibold shadow-[2px_0_0_0_#E8EEF4]">
                          Wk
                        </TableHead>
                        {Number(draft.phaseCount) > 1 ? (
                          <TableHead className="w-20 min-w-[5rem] bg-[#F2F5FA] px-2 py-3 text-[#2158A3] font-semibold">
                            Phase
                          </TableHead>
                        ) : null}
                        {[
                          { key: "mon", line: "Mon", sub: "Legs", kind: "strength" },
                          { key: "tue", line: "Tue", sub: "Recovery", kind: "recovery" },
                          { key: "wed", line: "Wed", sub: "Upper", kind: "strength" },
                          { key: "thu", line: "Thu", sub: "Recovery", kind: "recovery" },
                          { key: "fri", line: "Fri", sub: "Full", kind: "strength" },
                          { key: "sat", line: "Sat", sub: "", kind: "rest" },
                          { key: "sun", line: "Sun", sub: "", kind: "rest" },
                        ].map((col) => (
                          <TableHead
                            key={col.key}
                            className="min-w-[128px] px-2 py-3 text-[#2158A3] font-semibold align-bottom"
                          >
                            <span className="block text-sm leading-tight">{col.line}</span>
                            {col.sub ? (
                              <span
                                className={`mt-0.5 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                  col.kind === "recovery"
                                    ? "bg-emerald-100/90 text-emerald-900"
                                    : col.kind === "rest"
                                      ? "bg-slate-200/80 text-slate-700"
                                      : "bg-sky-100/90 text-sky-900"
                                }`}
                              >
                                {col.sub}
                              </span>
                            ) : null}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draft.schedule.map((row, wi) => {
                        const phases = draft?.phaseStructure?.phases ?? [];
                        const phaseIdx = phaseForWeek(phases, Number(row.week));
                        const phaseObj = phaseIdx ? phases[phaseIdx - 1] : null;
                        const phaseTone =
                          phaseIdx && phaseIdx >= 1
                            ? PHASE_COLOR_CLASSES[(phaseIdx - 1) % PHASE_COLOR_CLASSES.length]
                            : "bg-slate-100 text-slate-700 border-slate-200";
                        return (
                          <TableRow
                            key={row.week}
                            className="border-b border-[#E8EEF4] last:border-0 hover:bg-white/90"
                          >
                            <TableCell className="sticky left-0 z-10 bg-[#F8FAFC] px-2 py-2 font-semibold text-[#0A3161] align-middle shadow-[2px_0_0_0_#E8EEF4]">
                              W{row.week}
                            </TableCell>
                            {Number(draft.phaseCount) > 1 ? (
                              <TableCell className="px-2 py-2 align-middle">
                                {phaseIdx ? (
                                  <span
                                    title={phaseObj?.name || `Phase ${phaseIdx}`}
                                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${phaseTone}`}
                                  >
                                    P{phaseIdx}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[#94a3b8]">—</span>
                                )}
                              </TableCell>
                            ) : null}
                            {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((col) => (
                              <TableCell key={col} className="p-2 align-middle whitespace-normal">
                                <Input
                                  value={row[col] ?? ""}
                                  onChange={(e) => updateScheduleCell(wi, col, e.target.value)}
                                  className="h-10 text-xs border-[#C8D7E9] bg-white rounded-lg shadow-sm"
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </FormSection>
            </div>
          )}

          {activeTab === "workouts" && (
            <div className="w-full min-w-0 max-w-none space-y-6">
              {/* <p className="text-sm text-[#5671A6] -mt-1 w-full max-w-none leading-relaxed">
                <span className="font-medium text-[#2158A3]">Part 2: The workout library</span> — tag workouts
                to specific days. Three templates — Workout A (e.g. Monday legs), B (Wednesday upper), C (Friday full
                body). Fill <span className="font-medium text-[#2158A3]">sets</span>,{" "}
                <span className="font-medium text-[#2158A3]">rep range</span>,{" "}
                <span className="font-medium text-[#2158A3]">target muscles</span>, and{" "}
                <span className="font-medium text-[#2158A3]">instructions</span> (one line per step) for the member app.
              </p> */}
              {["A", "B", "C"].map((letter) => {
                const label =
                  letter === "A"
                    ? "Workout A — Beginner Legs (Monday)"
                    : letter === "B"
                      ? "Workout B — Beginner Upper (Wednesday)"
                      : "Workout C — Beginner Full Body (Friday)";
                const tone = letter === "A" ? "sky" : letter === "B" ? "violet" : "emerald";
                const meta =
                  (draft?.workoutsMeta && draft.workoutsMeta[letter]) || createEmptyWorkoutMeta();
                return (
                  <FormSection
                    key={letter}
                    title={label}
                    hint="Workout name and tag, e.g. Goblet Squat (Large Muscle)."
                    icon={
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0A3161] text-xs font-bold text-white shadow-sm">
                        {letter}
                      </span>
                    }
                    tone={tone}
                  >
                    {/* Workout meta — format, intervals, rounds, est. duration */}
                    {/* <div className="grid gap-3 rounded-xl border border-[#DCE7F5] bg-[#FAFCFF] p-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div>
                        <label className={lbl}>Format / structure</label>
                        <select
                          value={meta.format ?? "Standard sets"}
                          onChange={(e) => updateWorkoutMeta(letter, "format", e.target.value)}
                          className={`mt-1.5 ${selCls} h-10 text-xs`}
                        >
                          {WORKOUT_FORMAT_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Work interval</label>
                        <Input
                          value={meta.workInterval ?? ""}
                          onChange={(e) => updateWorkoutMeta(letter, "workInterval", e.target.value)}
                          placeholder="e.g. 40s"
                          className="mt-1.5 h-10 rounded-lg border-[#C8D7E9] text-xs"
                        />
                      </div>
                      <div>
                        <label className={lbl}>Rest between sets</label>
                        <Input
                          value={meta.restBetweenSets ?? ""}
                          onChange={(e) => updateWorkoutMeta(letter, "restBetweenSets", e.target.value)}
                          placeholder="e.g. 60s"
                          className="mt-1.5 h-10 rounded-lg border-[#C8D7E9] text-xs"
                        />
                      </div>
                      <div>
                        <label className={lbl}>Rounds</label>
                        <Input
                          value={meta.rounds ?? ""}
                          onChange={(e) => updateWorkoutMeta(letter, "rounds", e.target.value)}
                          placeholder="e.g. 3"
                          className="mt-1.5 h-10 rounded-lg border-[#C8D7E9] text-xs"
                        />
                      </div>
                      <div>
                        <label className={lbl}>Est. duration</label>
                        <Input
                          value={meta.estDuration ?? ""}
                          onChange={(e) => updateWorkoutMeta(letter, "estDuration", e.target.value)}
                          placeholder="e.g. 35 min"
                          className="mt-1.5 h-10 rounded-lg border-[#C8D7E9] text-xs"
                        />
                      </div>
                    </div> */}

                    <div className="mb-4 rounded-xl border border-[#DCE7F5] bg-[#FAFCFF] p-3">
                      <label className={lbl}>Workout thumbnail (Workout {letter})</label>
                      <p className="mt-0.5 text-[10px] text-[#5671A6]">
                        Cover image for this workout block in the app. Upload →{" "}
                        <span className="font-mono">workout_meta_media</span> →{" "}
                        <span className="font-mono">{letter}.thumbnail_url</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          className="max-w-full text-xs text-[#2158A3] file:mr-2 file:rounded-lg file:border-0 file:bg-[#0A3161] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                          onChange={(e) => handleWorkoutMetaThumbnailPick(letter, e)}
                        />
                        {meta.thumbnailPending?.file || meta.thumbnail_url ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => clearWorkoutMetaThumbnail(letter)}
                          >
                            Remove
                          </Button>
                        ) : null}
                        {meta.thumbnailPending?.blobUrl || meta.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={meta.thumbnailPending?.blobUrl || meta.thumbnail_url}
                            alt={`Workout ${letter} thumbnail`}
                            className="h-16 w-24 rounded-lg border border-[#DCE7F5] object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">No thumbnail yet</span>
                        )}
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-[#C8D7E9] bg-white shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#F2F5FA] hover:bg-[#F2F5FA] border-b border-[#D9E8F5]">
                            <TableHead className="w-14 px-2 py-3 text-[#2158A3] font-semibold">#</TableHead>
                            <TableHead className="min-w-[160px] px-2 py-3 text-[#2158A3] font-semibold">
                              Workout <ReqMark />
                            </TableHead>
                            <TableHead className="w-[min(200px,38vw)] px-2 py-3 text-[#2158A3] font-semibold">
                              Tag <ReqMark />
                            </TableHead>
                            <TableHead className="w-24 min-w-[6rem] px-2 py-3 text-[#2158A3] font-semibold">
                              Sets <ReqMark />
                            </TableHead>
                            <TableHead className="min-w-[100px] px-2 py-3 text-[#2158A3] font-semibold">
                              Rep range <ReqMark />
                            </TableHead>
                            <TableHead className="min-w-[180px] px-2 py-3 text-[#2158A3] font-semibold">
                              Media (video)
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {draft.workouts[letter].map((ex, i) => {
                            const tagValue = TAG_OPTIONS.includes(ex.tag) ? ex.tag : TAG_OPTIONS[0];
                            const mediaKey = `${letter}-${i}`;
                            const mediaUrls = Array.isArray(ex?.mediaUrls) ? ex.mediaUrls : [];
                            return (
                              <Fragment key={`${letter}-${i}`}>
                              <TableRow
                                className="border-b border-[#EEF2F7] hover:bg-[#FAFCFF]/70"
                              >
                                <TableCell className="px-2 py-2 align-top whitespace-normal">
                                  <div className="flex items-start gap-1">
                                    <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-[#E8EEF4] text-xs font-bold text-[#0A3161]">
                                      {letter}
                                      {i + 1}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 shrink-0 text-[#B91C1C] hover:bg-red-50 hover:text-[#991B1B] disabled:opacity-40"
                                      disabled={draft.workouts[letter].length <= 1}
                                      onClick={() => removeWorkoutExercise(letter, i)}
                                      aria-label="Remove exercise row"
                                      title={
                                        draft.workouts[letter].length <= 1
                                          ? "At least one row per workout"
                                          : "Remove this exercise"
                                      }
                                    >
                                      <HiOutlineTrash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-[220px] p-2 align-top whitespace-normal">
                                  <div className="flex flex-col gap-0.5">
                                    <Input
                                      value={ex.name}
                                      maxLength={MAX_EXERCISE_NAME_LEN}
                                      autoComplete="off"
                                      onChange={(e) =>
                                        updateWorkoutExercise(
                                          letter,
                                          i,
                                          "name",
                                          clampExerciseName(e.target.value)
                                        )
                                      }
                                      className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                                    />
                                    <p className="min-h-[14px] text-[10px] leading-none text-[#94a3b8]">
                                      Max {MAX_EXERCISE_NAME_LEN} chars (APK)
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-[200px] p-2 align-top whitespace-normal">
                                  <div className="flex flex-col gap-0.5">
                                    <select
                                      value={tagValue}
                                      onChange={(e) => updateWorkoutExercise(letter, i, "tag", e.target.value)}
                                      className="h-10 w-full max-w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm text-[#0A3161] outline-none focus:ring-2 focus:ring-[#0A3161]/25"
                                    >
                                      {TAG_OPTIONS.map((t) => (
                                        <option key={t} value={t}>
                                          {t}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="min-h-[14px] text-[10px] leading-none text-transparent select-none">.</p>
                                  </div>
                                </TableCell>
                                <TableCell className="w-24 min-w-[6rem] p-2 align-top whitespace-normal">
                                  <div className="flex flex-col gap-0.5">
                                    <Input
                                      type="number"
                                      min={1}
                                      max={MAX_EXERCISE_SETS}
                                      placeholder="4"
                                      value={
                                        ex.target_sets === "" || ex.target_sets == null
                                          ? ""
                                          : String(ex.target_sets)
                                      }
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        updateWorkoutExercise(
                                          letter,
                                          i,
                                          "target_sets",
                                          v === "" ? "" : clampExerciseSets(v)
                                        );
                                      }}
                                      className="h-10 w-full min-w-[5.5rem] border-[#C8D7E9] bg-white rounded-lg px-2 text-center text-sm tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                    <p className="min-h-[14px] text-center text-[10px] leading-none text-[#94a3b8]">
                                      Max {MAX_EXERCISE_SETS}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="min-w-[100px] p-2 align-top whitespace-normal">
                                  <div className="flex flex-col gap-0.5">
                                    <Input
                                      value={ex.target_reps_range ?? ""}
                                      maxLength={MAX_REP_RANGE_LEN}
                                      onChange={(e) =>
                                        updateWorkoutExercise(
                                          letter,
                                          i,
                                          "target_reps_range",
                                          clampRepRangeInput(e.target.value)
                                        )
                                      }
                                      placeholder="8–12"
                                      className="h-10 w-full min-w-[5.5rem] border-[#C8D7E9] bg-white rounded-lg text-sm"
                                    />
                                    <p className="min-h-[14px] text-[10px] leading-none text-transparent select-none">.</p>
                                  </div>
                                </TableCell>

                                <TableCell className="p-2 align-top">
                                  <div className="rounded-xl border border-[#DCE7F5] bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(10,49,97,0.05)]">
                                    <p className="mb-1.5 text-[10px] leading-snug text-[#5671A6]">
                                      Exercise video / extra images via{" "}
                                      <span className="font-mono text-[10px] text-[#0A3161]">library_media</span>.
                                      Thumbnail is set separately below.
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <label className="inline-flex h-8 min-w-[102px] cursor-pointer items-center justify-center rounded-md border border-[#BDD2EE] bg-[#EEF5FF] px-3 text-[11px] font-semibold text-[#0A3161] transition hover:bg-[#E1EEFF]">
                                        Upload files
                                        <input
                                          type="file"
                                          accept="image/*,image/gif,video/*"
                                          multiple
                                          onChange={(e) => handleWorkoutRowMediaFiles(letter, i, e.target.files)}
                                          className="sr-only"
                                        />
                                      </label>

                                      {mediaUrls.length ? (
                                        <div className="min-w-0 flex-1 overflow-x-auto">
                                          <div className="flex items-center gap-1.5 pr-1">
                                            {mediaUrls.slice(0, 3).map((url, idx) => {
                                              const preview = workoutRowMediaPreviews?.[mediaKey]?.[idx];
                                              const isVideo =
                                                String(preview?.type ?? "").startsWith("video/") ||
                                                /\.(mp4|webm|ogg)(\?|#|$)/i.test(String(url));
                                              const isImage =
                                                String(preview?.type ?? "").startsWith("image/") ||
                                                /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(String(url));
                                              return (
                                                <div
                                                  key={`${url}-${idx}`}
                                                  className="relative h-8 w-10 shrink-0 overflow-hidden rounded border border-[#DEE8F5] bg-[#FAFCFF]"
                                                >
                                                  <button
                                                    type="button"
                                                    onClick={() => removeWorkoutRowMediaAt(letter, i, idx)}
                                                    className="absolute right-0.5 top-0.5 z-10 inline-flex h-3.5 w-3.5 items-center justify-center rounded bg-white/95 text-[9px] font-bold text-[#B91C1C] border border-[#E8EEF4]"
                                                    aria-label="Remove media"
                                                  >
                                                    ×
                                                  </button>
                                                  {isVideo ? (
                                                    <div className="flex h-full w-full items-center justify-center text-[8px] font-semibold text-[#2158A3]">
                                                      VID
                                                    </div>
                                                  ) : isImage ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={url} alt="Workout media" className="h-full w-full object-cover" />
                                                  ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-[8px] text-muted-foreground">
                                                      FILE
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                            {mediaUrls.length > 3 ? (
                                              <div className="inline-flex h-8 shrink-0 items-center rounded border border-dashed border-[#C8D7E9] px-1.5 text-[9px] font-medium text-muted-foreground">
                                                +{mediaUrls.length - 3}
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="min-w-0 flex-1 text-[10px] text-muted-foreground">No files selected</div>
                                      )}

                                      <span className="shrink-0 rounded-full bg-[#F8FAFE] px-2 py-1 text-[10px] font-medium text-muted-foreground border border-[#E1EAF6]">
                                        {mediaUrls.length ? `${mediaUrls.length} file${mediaUrls.length > 1 ? "s" : ""}` : "No files"}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                              <TableRow className="border-b border-[#EEF2F7] bg-[#FAFCFF]/80">
                                <TableCell colSpan={6} className="px-3 py-3 align-top">
                                  <div className="mb-3 rounded-lg border border-[#E8EEF4] bg-white p-3">
                                    <label className="block text-xs font-medium text-[#5671A6] mb-1">
                                      Exercise thumbnail
                                    </label>
                                    <p className="mb-2 text-[10px] text-[#94a3b8]">
                                      One image per exercise (saved to{" "}
                                      <span className="font-mono">exerciseLibrary.{letter}[n].thumbnail_url</span>).
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-[#BDD2EE] bg-[#EEF5FF] px-3 text-[11px] font-semibold text-[#0A3161] hover:bg-[#E1EEFF]">
                                        Upload thumbnail
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="sr-only"
                                          onChange={(e) => handleExerciseThumbnailPick(letter, i, e)}
                                        />
                                      </label>
                                      {ex.thumbnailPending?.file || ex.thumbnail_url ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-8 text-xs"
                                          onClick={() => clearExerciseThumbnail(letter, i)}
                                        >
                                          Remove
                                        </Button>
                                      ) : null}
                                      {ex.thumbnailPending?.blobUrl || ex.thumbnail_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={ex.thumbnailPending?.blobUrl || ex.thumbnail_url}
                                          alt={`${ex.name || "Exercise"} thumbnail`}
                                          className="h-14 w-20 rounded border border-[#DCE7F5] object-cover"
                                        />
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground">No thumbnail</span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Time / calories + role / tempo / rest / alternative / notes */}
                                  <div className="mb-3 grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <label className="block text-xs font-medium text-[#5671A6] mb-1">
                                        Time (minutes)
                                      </label>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={MAX_EXERCISE_TIME_MINUTES}
                                        step={1}
                                        value={
                                          ex.time_minutes === "" || ex.time_minutes == null
                                            ? ""
                                            : String(ex.time_minutes)
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          updateWorkoutExercise(
                                            letter,
                                            i,
                                            "time_minutes",
                                            clampExerciseTimeMinutes(v)
                                          );
                                        }}
                                        placeholder="e.g. 5"
                                        className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                                      />
                                      <p className="mt-1 text-[10px] text-[#94a3b8]">
                                        Member app · max {MAX_EXERCISE_TIME_MINUTES} min
                                      </p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-[#5671A6] mb-1">
                                        Est. calories
                                      </label>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={MAX_EXERCISE_CALORIES}
                                        step={1}
                                        value={
                                          ex.estimated_calories === "" || ex.estimated_calories == null
                                            ? ""
                                            : String(ex.estimated_calories)
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          updateWorkoutExercise(
                                            letter,
                                            i,
                                            "estimated_calories",
                                            clampExerciseCalories(v)
                                          );
                                        }}
                                        placeholder="e.g. 45"
                                        className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                                      />
                                      <p className="mt-1 text-[10px] text-[#94a3b8]">
                                        Member app · max {MAX_EXERCISE_CALORIES.toLocaleString()} kcal
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-6">
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-medium text-[#5671A6] mb-1">
                                        Role
                                      </label>
                                      <select
                                        value={ex.role ?? "Primary"}
                                        onChange={(e) =>
                                          updateWorkoutExercise(letter, i, "role", e.target.value)
                                        }
                                        className={`h-10 w-full rounded-lg border border-[#C8D7E9] bg-white px-3 text-sm text-[#0A3161] outline-none focus:ring-2 focus:ring-[#0A3161]/25`}
                                      >
                                        {EXERCISE_ROLE_OPTIONS.map((r) => (
                                          <option key={r} value={r}>
                                            {r}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-medium text-[#5671A6] mb-1">Tempo</label>
                                      <Input
                                        value={ex.tempo ?? ""}
                                        onChange={(e) =>
                                          updateWorkoutExercise(letter, i, "tempo", e.target.value)
                                        }
                                        placeholder="e.g. 3-1-1 / Slow"
                                        className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-medium text-[#5671A6] mb-1">Rest</label>
                                      <Input
                                        value={ex.restPerExercise ?? ""}
                                        onChange={(e) =>
                                          updateWorkoutExercise(letter, i, "restPerExercise", e.target.value)
                                        }
                                        placeholder="e.g. 60s"
                                        className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                                      />
                                    </div>
                                    <div className="md:col-span-3">
                                      <label className="block text-xs font-medium text-[#5671A6] mb-1">Alternative</label>
                                      <Input
                                        value={ex.alternative ?? ""}
                                        onChange={(e) =>
                                          updateWorkoutExercise(letter, i, "alternative", e.target.value)
                                        }
                                        placeholder="e.g. Bodyweight squat"
                                        className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                                      />
                                    </div>
                                    <div className="md:col-span-3">
                                      <label className="block text-xs font-medium text-[#5671A6] mb-1">Notes</label>
                                      <Input
                                        value={ex.notes ?? ""}
                                        onChange={(e) =>
                                          updateWorkoutExercise(letter, i, "notes", e.target.value)
                                        }
                                        placeholder="Cues / safety notes…"
                                        className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                                      />
                                    </div>
                                  </div>

                                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <div className="min-w-0">
                                      <label className="block text-xs font-medium text-[#5671A6] mb-1">
                                        Target muscles <ReqMark />
                                      </label>
                                      <Input
                                        value={ex.targetMusclesText ?? ""}
                                        onChange={(e) =>
                                          updateWorkoutExercise(
                                            letter,
                                            i,
                                            "targetMusclesText",
                                            e.target.value
                                          )
                                        }
                                        placeholder="e.g. Chest, Triceps, Shoulders"
                                        className="h-10 border-[#C8D7E9] bg-white rounded-lg text-sm"
                                      />
                                      <p className="mt-1 text-[10px] text-[#94a3b8]">Comma-separated</p>
                                    </div>
                                    <div className="min-w-0 md:col-span-2">
                                      <label className="block text-xs font-medium text-[#5671A6] mb-1">
                                        Instructions <ReqMark />
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={ex.instructionsText ?? ""}
                                        maxLength={MAX_INSTRUCTIONS_LEN}
                                        autoComplete="off"
                                        name={`exercise-instructions-${letter}-${i}`}
                                        onChange={(e) =>
                                          updateWorkoutExercise(
                                            letter,
                                            i,
                                            "instructionsText",
                                            clampInstructionsText(e.target.value)
                                          )
                                        }
                                        placeholder={"One step per line, e.g.\nLie on bench\nGrip bar\nPress up"}
                                        className="w-full max-w-full break-words overflow-auto rounded-lg border border-[#C8D7E9] bg-white px-3 py-2 text-sm text-[#0A3161] outline-none focus:ring-2 focus:ring-[#0A3161]/25 min-h-[4.5rem] max-h-40"
                                      />
                                      <p className="mt-0.5 text-[10px] text-[#94a3b8]">
                                        One line per step · not added to Tag dropdown
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                              </Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E8EEF4] bg-[#FAFCFF]/60 px-3 py-2.5">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-dashed border-[#C8D7E9] text-[#2158A3] hover:bg-[#F2F5FA] sm:w-auto"
                          onClick={() => addWorkoutExercise(letter)}
                        >
                          + Add exercise
                        </Button>
                      </div>
                    </div>

                    {/* Progressive overload grid (admin mockup) */}
                    <div className="mt-4 rounded-xl border border-[#C8D7E9] bg-white p-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#2158A3]">
                          Progressive overload grid
                        </h4>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 border-[#C8D7E9] text-xs text-[#2158A3] hover:bg-[#F2F5FA]"
                          onClick={() => ensureOverloadRows(letter, draft.durationWeeks)}
                        >
                          Sync to {draft.durationWeeks || 4} weeks
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <Table className="min-w-[640px]">
                          <TableHeader>
                            <TableRow className="bg-[#F2F5FA] hover:bg-[#F2F5FA] border-b border-[#D9E8F5]">
                              <TableHead className="w-16 px-2 py-2 text-[#2158A3] font-semibold">Week</TableHead>
                              <TableHead className="w-20 px-2 py-2 text-[#2158A3] font-semibold">Sets</TableHead>
                              <TableHead className="w-24 px-2 py-2 text-[#2158A3] font-semibold">Reps</TableHead>
                              <TableHead className="w-24 px-2 py-2 text-[#2158A3] font-semibold">Rest</TableHead>
                              <TableHead className="px-2 py-2 text-[#2158A3] font-semibold">UI prompt / note</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(Array.isArray(meta.overload) ? meta.overload : []).map((row, ri) => (
                              <TableRow key={ri} className="border-b border-[#EEF2F7]">
                                <TableCell className="px-2 py-1.5 align-middle font-mono text-xs text-[#5671A6]">
                                  W{row.week}
                                </TableCell>
                                <TableCell className="px-2 py-1.5 align-middle">
                                  <Input
                                    value={row.sets ?? ""}
                                    onChange={(e) => updateOverloadRow(letter, ri, "sets", e.target.value)}
                                    className="h-9 border-[#C8D7E9] bg-white rounded-md text-xs"
                                  />
                                </TableCell>
                                <TableCell className="px-2 py-1.5 align-middle">
                                  <Input
                                    value={row.reps ?? ""}
                                    onChange={(e) => updateOverloadRow(letter, ri, "reps", e.target.value)}
                                    className="h-9 border-[#C8D7E9] bg-white rounded-md text-xs"
                                  />
                                </TableCell>
                                <TableCell className="px-2 py-1.5 align-middle">
                                  <Input
                                    value={row.rest ?? ""}
                                    onChange={(e) => updateOverloadRow(letter, ri, "rest", e.target.value)}
                                    placeholder="60s"
                                    className="h-9 border-[#C8D7E9] bg-white rounded-md text-xs"
                                  />
                                </TableCell>
                                <TableCell className="px-2 py-1.5 align-middle">
                                  <Input
                                    value={row.note ?? ""}
                                    onChange={(e) => updateOverloadRow(letter, ri, "note", e.target.value)}
                                    placeholder="Focus on form…"
                                    className="h-9 border-[#C8D7E9] bg-white rounded-md text-xs"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                            {(!Array.isArray(meta.overload) || meta.overload.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={5} className="px-3 py-4 text-center text-xs text-[#5671A6]">
                                  Click <span className="font-medium text-[#2158A3]">Sync to {draft.durationWeeks || 4} weeks</span> to build the overload grid.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Workout-level notes */}
                    <div className="mt-3">
                      <label className={lbl}>Workout-level notes / instructions</label>
                      <textarea
                        rows={3}
                        value={meta.levelNotes ?? ""}
                        onChange={(e) => updateWorkoutMeta(letter, "levelNotes", e.target.value)}
                        className={`mt-1.5 ${ta}`}
                        placeholder="Warm-up cues, safety notes, anything that applies to the whole workout…"
                      />
                    </div>
                  </FormSection>
                );
              })}

              {/* Workout engine settings — timer types + special UI features */}
              {/* <FormSection
                title="Workout engine settings"
                hint="Choose timers and special UI features the app should enable for this program."
                icon={<HiOutlineCog />}
                tone="slate"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className={lbl}>Timer types required</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {TIMER_TYPE_OPTIONS.map((opt) => {
                        const selected =
                          Array.isArray(draft?.engineSettings?.timerTypes) &&
                          draft.engineSettings.timerTypes.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleEngineOption("timerTypes", opt)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              selected
                                ? "border-[#0A3161] bg-[#0A3161]/10 text-[#0A3161]"
                                : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Special UI features</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {UI_FEATURE_OPTIONS.map((opt) => {
                        const selected =
                          Array.isArray(draft?.engineSettings?.uiFeatures) &&
                          draft.engineSettings.uiFeatures.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleEngineOption("uiFeatures", opt)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              selected
                                ? "border-[#0A3161] bg-[#0A3161]/10 text-[#0A3161]"
                                : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </FormSection> */}
            </div>
          )}

          {activeTab === "recovery" && (
            <div className="">
              <div className="mb-10 flex w-full min-w-0 flex-col gap-5 lg:flex-row lg:items-stretch">
                <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#C8D7E9] bg-white shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 px-5 py-4 bg-gradient-to-r from-sky-50 via-white to-emerald-50/80 border-b border-[#D9E8F5]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-sm">
                      <FaHeartbeat className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#0A3161]">Block 1: LISS cardio</h3>
                    <p className="text-xs text-[#5671A6]">Duration, prompt, activity options (e.g. Brisk Walk, …)</p>
                    </div>
                  </div>
                  <div className="p-5 md:p-6 space-y-5">
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <label className={lbl}>
                          Duration <ReqMark />
                        </label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={draft.recovery.lissMinutes}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                recovery: {
                                  ...draft.recovery,
                                  lissMinutes: Number(e.target.value) || 1,
                                },
                              })
                            }
                            className="h-12 w-24 text-center text-lg font-semibold text-[#0A3161] border-[#C8D7E9] rounded-xl"
                          />
                          <span className="text-sm font-medium text-[#2158A3] pb-1">minutes</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>
                        Coach prompt <ReqMark />
                      </label>
                      <textarea
                        rows={3}
                        value={draft.recovery.lissPrompt}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            recovery: { ...draft.recovery, lissPrompt: e.target.value },
                          })
                        }
                        className={`mt-1.5 ${ta}`}
                        placeholder="How hard should it feel?"
                      />
                    </div>
                    <div>
                      <label className={lbl}>
                        Activity options <ReqMark />
                      </label>
                      <p className="text-xs text-[#5671A6] mt-0.5 mb-2">
                        Comma-separated — preview below shows how chips may appear in the app.
                      </p>
                      <Input
                        value={draft.recovery.lissOptions}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            recovery: { ...draft.recovery, lissOptions: e.target.value },
                          })
                        }
                        className="h-11 border-[#C8D7E9] rounded-xl bg-white"
                        placeholder="Brisk Walk, Incline Treadmill, …"
                      />
                      {lissOptionChips.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {lissOptionChips.map((opt) => (
                            <span
                              key={opt}
                              className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-900"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={lbl}>Recovery media (images / GIF / video)</label>
                      <p className="text-xs text-[#5671A6] mt-0.5 mb-2">
                        Optional — previews show here; on save files are uploaded as{" "}
                        <span className="font-mono text-[11px]">recovery_media</span> mapped to cardio (see backend).
                      </p>
                      <div className="grid gap-3 sm:grid-cols-1">
                        <div className="rounded-xl border border-[#C8D7E9] bg-[#FCFDFF] p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#2158A3]">Upload files</p>
                            <p className="text-[11px] text-muted-foreground">
                              {(draft?.recovery?.mediaUrls?.length ?? 0) ? `${draft.recovery.mediaUrls.length} attached` : "No files"}
                            </p>
                          </div>
                          <label className="mt-3 flex min-h-[78px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#BFD3EE] bg-white px-4 py-3 text-xs font-semibold text-[#0A3161] transition hover:bg-[#EFF5FF]">
                            Click to upload images, GIFs, or video
                            <input
                              type="file"
                              accept="image/*,image/gif,video/*"
                              multiple
                              onChange={(e) => handleRecoveryMediaFiles(e.target.files)}
                              className="sr-only"
                            />
                          </label>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Tip: use GIF for movement demo or MP4 for short guided clip.
                          </p>
                        </div>

                        {/* <div className="rounded-xl border border-[#C8D7E9] bg-white p-3">
                          <p className="text-xs font-semibold text-[#2158A3]">Or paste URL</p>
                          <div className="mt-2 flex gap-2">
                            <Input
                              value={draft?.recovery?.mediaUrlDraft ?? ""}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  recovery: { ...d.recovery, mediaUrlDraft: e.target.value },
                                }))
                              }
                              placeholder="https://... (image/gif/video url)"
                              className="h-10 border-[#C8D7E9] rounded-lg bg-white text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 border-[#C8D7E9] bg-white"
                              onClick={() => {
                                const url = String(draft?.recovery?.mediaUrlDraft ?? "").trim();
                                if (!url) return;
                                addRecoveryMediaUrls([url]);
                                setDraft((d) => ({
                                  ...d,
                                  recovery: { ...d.recovery, mediaUrlDraft: "" },
                                }));
                              }}
                            >
                              Add
                            </Button>
                          </div>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Use this when media is hosted (CDN/S3).
                          </p>
                        </div> */}
                      </div>

                      {(draft?.recovery?.mediaUrls?.length ?? 0) > 0 ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {(draft.recovery.mediaUrls ?? []).slice(0, 8).map((url, idx) => {
                            const preview = Array.isArray(recoveryMediaPreviews)
                              ? recoveryMediaPreviews.find((p) => p?.url === url)
                              : undefined;
                            const kind = recoveryMediaDisplayKind(url, preview);
                            return (
                              <div
                                key={`${url}-${idx}`}
                                className="relative overflow-hidden rounded-xl border border-[#C8D7E9] bg-white shadow-sm"
                              >
                                <div className="absolute right-2 top-2 z-10">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 bg-white/85 hover:bg-white text-[#B91C1C]"
                                    onClick={() => removeRecoveryMediaAt(idx)}
                                    aria-label="Remove media"
                                  >
                                    <HiOutlineTrash className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="aspect-video bg-muted/20 flex items-center justify-center overflow-hidden">
                                  {kind === "video" ? (
                                    // eslint-disable-next-line jsx-a11y/media-has-caption
                                    <video
                                      src={url}
                                      controls
                                      playsInline
                                      className="h-full w-full object-cover bg-black"
                                      preload="metadata"
                                    />
                                  ) : kind === "image" || kind === "blob" ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={url} alt="Recovery media" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="p-3 text-xs text-muted-foreground break-all">{url}</div>
                                  )}
                                </div>
                                <div className="px-3 py-2 text-xs text-muted-foreground break-all">
                                  {preview?.name ?? url}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#C8D7E9] bg-white pb-7 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 px-5 py-4 bg-gradient-to-r from-emerald-50 via-white to-amber-50/60 border-b border-[#E5EDE5]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shadow-sm">
                      <FaLeaf className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#0A3161]">Block 2: The Big 4 stretches</h3>
                      <p className="text-xs text-[#5671A6]">Ordered steps after cardio — name + detail/duration per line</p>
                    </div>
                  </div>
                  <div className="p-5 md:p-6">
                    <div className="max-h-[520px] overflow-y-auto pr-1 space-y-3 [scrollbar-width:thin] [scrollbar-color:rgba(10,49,97,0.28)_transparent] dark:[scrollbar-color:rgba(255,255,255,0.25)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-900/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-slate-900/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
                      {draft.recovery.stretches.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 sm:gap-3 rounded-xl border border-[#D4E4D4] bg-[#FAFDF8] p-3 shadow-sm"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A3161] text-xs font-bold text-white">
                            {i + 1}
                          </div>
                          <div className="grid min-w-0 flex-1 gap-2.5 sm:grid-cols-2">
                            <div>
                              <label className={lbl}>
                                Stretch name <ReqMark />
                              </label>
                              <Input
                                value={s.name}
                                onChange={(e) => updateStretch(i, "name", e.target.value)}
                                className="mt-1 h-10 border-[#C8D7E9] bg-white rounded-lg"
                                maxLength={MAX_EXERCISE_NAME_LEN}
                              />
                            </div>
                            <div>
                              <label className={lbl}>
                                Detail / duration <ReqMark />
                              </label>
                              <Input
                                value={s.detail}
                                onChange={(e) => updateStretch(i, "detail", e.target.value)}
                                className="mt-1 h-10 border-[#C8D7E9] bg-white rounded-lg"
                                placeholder="e.g. 1m per side"
                                maxLength={MAX_STRETCH_DETAIL_LEN}
                              />
                              <p className="mt-1 text-[11px] text-[#5671A6]">
                                Max {MAX_STRETCH_DURATION_MINUTES} minutes · {MAX_STRETCH_DETAIL_LEN} characters
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-[#B91C1C] hover:bg-red-50 hover:text-[#991B1B] disabled:opacity-40"
                            disabled={draft.recovery.stretches.length <= 1}
                            onClick={() =>
                              setStretchDeleteTarget({
                                index: i,
                                name: s.name?.trim() || `Stretch ${i + 1}`,
                              })
                            }
                            aria-label="Delete stretch"
                            title={
                              draft.recovery.stretches.length <= 1
                                ? "At least one stretch required"
                                : "Delete stretch"
                            }
                          >
                            <HiOutlineTrash className="h-5 w-5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed border-[#C8D7E9] text-[#2158A3] hover:bg-[#F2F5FA]"
                        onClick={addStretch}
                      >
                        + Add stretch
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra recovery blocks (admin mockup) */}
              <FormSection
                title="Extra recovery blocks"
                hint="Add additional recovery blocks beyond LISS + Big-4 — mobility flows, breathwork, or custom protocols."
                icon={<FaLeaf />}
                tone="emerald"
                className="mt-2"
              >
                <div className="space-y-3">
                  {(Array.isArray(draft.recoveryBlocks) ? draft.recoveryBlocks : []).map((block, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#C8D7E9] bg-[#FAFCFF] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={block.type ?? "LISS Cardio"}
                            onChange={(e) => updateRecoveryBlock(idx, "type", e.target.value)}
                            className="h-8 rounded-md border border-[#C8D7E9] bg-white px-2 text-xs text-[#0A3161]"
                          >
                            {RECOVERY_BLOCK_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <Input
                            value={block.name ?? ""}
                            onChange={(e) => updateRecoveryBlock(idx, "name", e.target.value)}
                            placeholder="Block name"
                            className="h-8 w-56 border-[#C8D7E9] rounded-md bg-white text-xs"
                          />
                          <select
                            value={block.dayAssignment ?? "Recovery day"}
                            onChange={(e) => updateRecoveryBlock(idx, "dayAssignment", e.target.value)}
                            className="h-8 rounded-md border border-[#C8D7E9] bg-white px-2 text-xs text-[#0A3161]"
                          >
                            {RECOVERY_BLOCK_DAYS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#B91C1C] hover:bg-red-50 hover:text-[#991B1B]"
                          onClick={() => removeRecoveryBlock(idx)}
                          aria-label="Remove block"
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className={lbl}>Duration</label>
                          <Input
                            value={block.duration ?? ""}
                            onChange={(e) => updateRecoveryBlock(idx, "duration", e.target.value)}
                            placeholder="e.g. 20 min"
                            className="mt-1.5 h-10 rounded-lg border-[#C8D7E9] text-sm"
                          />
                        </div>
                        <div>
                          <label className={lbl}>Intensity target</label>
                          <Input
                            value={block.intensity ?? ""}
                            onChange={(e) => updateRecoveryBlock(idx, "intensity", e.target.value)}
                            placeholder="e.g. 60–70% max HR"
                            className="mt-1.5 h-10 rounded-lg border-[#C8D7E9] text-sm"
                          />
                        </div>
                        <div>
                          <label className={lbl}>Modality options</label>
                          <Input
                            value={block.modality ?? ""}
                            onChange={(e) => updateRecoveryBlock(idx, "modality", e.target.value)}
                            placeholder="Walk, Bike, Row, Elliptical"
                            className="mt-1.5 h-10 rounded-lg border-[#C8D7E9] text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className={lbl}>Format</label>
                          <select
                            value={block.format ?? "Single circuit"}
                            onChange={(e) => updateRecoveryBlock(idx, "format", e.target.value)}
                            className={`mt-1.5 ${selCls}`}
                          >
                            {RECOVERY_BLOCK_FORMATS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>Rounds — Phase 1</label>
                          <Input
                            value={block.roundsP1 ?? ""}
                            onChange={(e) => updateRecoveryBlock(idx, "roundsP1", e.target.value)}
                            placeholder="e.g. 2"
                            className="mt-1.5 h-10 rounded-lg border-[#C8D7E9] text-sm"
                          />
                        </div>
                        <div>
                          <label className={lbl}>Rounds — Phase 2</label>
                          <Input
                            value={block.roundsP2 ?? ""}
                            onChange={(e) => updateRecoveryBlock(idx, "roundsP2", e.target.value)}
                            placeholder="e.g. 3"
                            className="mt-1.5 h-10 rounded-lg border-[#C8D7E9] text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className={lbl}>User instruction</label>
                        <textarea
                          rows={2}
                          value={block.instruction ?? ""}
                          onChange={(e) => updateRecoveryBlock(idx, "instruction", e.target.value)}
                          className={`mt-1.5 ${ta} min-h-[60px]`}
                          placeholder="Instruction shown to user when this block starts…"
                        />
                      </div>

                      {/* Exercises inside the block */}
                      <div className="mt-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#2158A3]">Exercises</span>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-7 border-[#C8D7E9] text-xs text-[#2158A3]"
                            onClick={() => addRecoveryBlockItem(idx)}
                          >
                            <HiOutlinePlus className="mr-1 h-3.5 w-3.5" /> Add
                          </Button>
                        </div>
                        <ul className="space-y-2">
                          {(Array.isArray(block.items) ? block.items : []).map((item, i) => (
                            <li key={i} className="flex flex-wrap items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8EEF4] text-[10px] font-bold text-[#0A3161]">
                                {i + 1}
                              </span>
                              <Input
                                value={item.name ?? ""}
                                onChange={(e) => updateRecoveryBlockItem(idx, i, "name", e.target.value)}
                                placeholder="Exercise name"
                                className="h-9 flex-1 min-w-[140px] border-[#C8D7E9] rounded-md bg-white text-sm"
                              />
                              <Input
                                value={item.duration ?? ""}
                                onChange={(e) => updateRecoveryBlockItem(idx, i, "duration", e.target.value)}
                                placeholder="Duration / reps"
                                className="h-9 w-32 border-[#C8D7E9] rounded-md bg-white text-sm"
                              />
                              <Input
                                value={item.target ?? ""}
                                onChange={(e) => updateRecoveryBlockItem(idx, i, "target", e.target.value)}
                                placeholder="Target / cue"
                                className="h-9 flex-1 min-w-[140px] border-[#C8D7E9] rounded-md bg-white text-sm"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-[#B91C1C] hover:bg-red-50 hover:text-[#991B1B]"
                                onClick={() => removeRecoveryBlockItem(idx, i)}
                                aria-label="Remove exercise"
                              >
                                <HiOutlineTrash className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2">
                    {RECOVERY_BLOCK_TYPES.map((t) => (
                      <Button
                        key={t}
                        type="button"
                        variant="outline"
                        className="border-dashed border-[#C8D7E9] text-[#2158A3] hover:bg-[#F2F5FA]"
                        onClick={() => addRecoveryBlock(t)}
                      >
                        + {t}
                      </Button>
                    ))}
                  </div>
                </div>
              </FormSection>

              {/* Rest day configuration */}
              <FormSection
                title="Rest day configuration"
                hint="Defines what shows on full-rest days (Sat / Sun in most programs)."
                icon={<HiOutlineSparkles />}
                tone="slate"
                className="mt-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Rest day type</label>
                    <select
                      value={draft?.restDayConfig?.type ?? ""}
                      onChange={(e) => setLogicNested("restDayConfig", "type", e.target.value)}
                      className={`mt-1.5 ${selCls}`}
                    >
                      <option value="">Select type</option>
                      {REST_DAY_TYPES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Rest day message shown to user</label>
                    <Input
                      value={draft?.restDayConfig?.message ?? ""}
                      onChange={(e) => setLogicNested("restDayConfig", "message", e.target.value)}
                      placeholder="e.g. Full rest. Meal prep for the week ahead."
                      className="mt-1.5 h-11 rounded-lg border-[#C8D7E9]"
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {[
                    {
                      key: "deepRecovery",
                      label: "Deep recovery protocol",
                      desc: "Soft tissue, contrast shower, and breathing sequence (Elite Metabolic style).",
                    },
                    {
                      key: "outdoorActivity",
                      label: "Outdoor / community activity",
                      desc: "Saturday Unite day — hike, bike, rucking, community walk.",
                    },
                  ].map((row) => (
                    <label
                      key={row.key}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#C8D7E9] bg-[#FAFCFF] px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[#0A3161]">{row.label}</span>
                        <span className="block text-xs text-[#5671A6]">{row.desc}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(draft?.restDayConfig?.[row.key])}
                        onChange={(e) => setLogicNested("restDayConfig", row.key, e.target.checked)}
                        className="h-5 w-5 accent-[#0A3161]"
                      />
                    </label>
                  ))}
                </div>
              </FormSection>

              {/* Injury prevention & safety */}
              <FormSection
                title="Injury prevention & safety notes"
                hint="Free-text safety notes plus high-level enforcement toggles (used by the workout engine)."
                icon={<HiOutlineShieldCheck />}
                tone="amber"
                className="mt-4"
              >
                <textarea
                  rows={3}
                  value={draft?.injuryPrevention?.notes ?? ""}
                  onChange={(e) => setLogicNested("injuryPrevention", "notes", e.target.value)}
                  className={ta}
                  placeholder="e.g. Progression is capped at +2.5–5% per week. Form must remain spotless before increasing weight."
                />

                <div className="mt-3 space-y-2">
                  {[
                    {
                      key: "prenatalMode",
                      label: "Prenatal safety mode",
                      desc: "Auto-provides supine alternatives in Phase 2 & 3; enforces RPE ≤ 7.",
                    },
                    {
                      key: "weightGuard",
                      label: "Weight progression guard",
                      desc: "App prompts +2.5–5% per week only if form check passes.",
                    },
                    {
                      key: "deloadWeeks",
                      label: "Mandatory deload weeks",
                      desc: "Insert deload week before Phase 3 (e.g. Shred to Stage).",
                    },
                  ].map((row) => (
                    <label
                      key={row.key}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#C8D7E9] bg-[#FAFCFF] px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[#0A3161]">{row.label}</span>
                        <span className="block text-xs text-[#5671A6]">{row.desc}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(draft?.injuryPrevention?.[row.key])}
                        onChange={(e) => setLogicNested("injuryPrevention", row.key, e.target.checked)}
                        className="h-5 w-5 accent-[#0A3161]"
                      />
                    </label>
                  ))}
                </div>
              </FormSection>

              {/* In-app recovery tips */}
              <FormSection
                title="In-app recovery tips"
                hint="Motivational or educational pop-ups shown on recovery days."
                icon={<HiOutlineLightBulb />}
                tone="violet"
                className="mt-4"
              >
                <div className="space-y-2">
                  {(Array.isArray(draft.recoveryTips) ? draft.recoveryTips : []).map((tip, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <select
                        value={tip.day ?? "Any recovery day"}
                        onChange={(e) => updateRecoveryTip(i, "day", e.target.value)}
                        className="h-10 w-40 rounded-lg border border-[#C8D7E9] bg-white px-2 text-xs text-[#0A3161]"
                      >
                        {TIP_DAY_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={tip.text ?? ""}
                        onChange={(e) => updateRecoveryTip(i, "text", e.target.value)}
                        placeholder="Tip text shown to user…"
                        className="h-10 flex-1 min-w-[200px] border-[#C8D7E9] rounded-lg bg-white text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-[#B91C1C] hover:bg-red-50 hover:text-[#991B1B]"
                        onClick={() => removeRecoveryTip(i)}
                        aria-label="Remove tip"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-[#C8D7E9] text-[#2158A3] hover:bg-[#F2F5FA]"
                    onClick={addRecoveryTip}
                  >
                    + Add tip
                  </Button>
                </div>
              </FormSection>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#E0E7F5] bg-[#F2F5FA] px-3 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 sm:px-6 md:px-8">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 w-full min-w-[140px] border-[#C8D7E9] bg-white px-5 sm:w-auto"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          {wizardMode && currentIdx > 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-[#C8D7E9] bg-white sm:w-auto"
              onClick={goToPrevious}
              disabled={isSaving}
            >
              Back
            </Button>
          )}
          {wizardMode && currentIdx < TAB_IDS.length - 1 && (
            <Button
              type="button"
              className="w-full bg-[#2158A3] px-5 hover:bg-[#1a4682] sm:w-auto sm:min-w-[min(100%,220px)]"
              onClick={validateCurrentAndGoNext}
              disabled={isSaving || isAdvancing}
            >
              {nextButtonText}
            </Button>
          )}
          {(!wizardMode || currentIdx === TAB_IDS.length - 1) && (
            <Button
              type="button"
              className="h-11 min-h-11 w-full min-w-[140px] bg-[#0A3161] px-5 hover:bg-[#0D3D7A] sm:w-auto"
              onClick={() => onSave()}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : saveLabel}
            </Button>
          )}
        </div>
      </div>

      {stretchDeleteTarget && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#0A3161]">Delete stretch?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Remove this stretch from Block 2: The Big 4 stretches?
            </p>
            <p className="mt-2 max-h-24 overflow-y-auto break-words text-sm font-medium text-[#0A3161]">
              {stretchDeleteTarget.name}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setStretchDeleteTarget(null)}>
                Cancel
              </Button>
              <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={confirmRemoveStretch}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
