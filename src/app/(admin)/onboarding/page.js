"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPortal } from "react-dom";
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiX } from "react-icons/hi";

const DRAFT_KEY = "admin:onboarding-flow:draft:v1";

const STEP_TYPES = [
  { id: "single_select", label: "Single select" },
  { id: "multi_select", label: "Multi select" },
  { id: "number", label: "Number" },
  { id: "text", label: "Text" },
];

function makeId(prefix = "step") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function defaultFlowFromPdf() {
  return {
    version: 1,
    name: "Default Onboarding",
    steps: [
      {
        id: "gender",
        order: 1,
        title: "What's your gender?",
        subtitle: "This helps us personalize your fitness plan",
        type: "single_select",
        options: ["Male", "Female"],
        required: true,
      },
      {
        id: "height",
        order: 2,
        title: "What's your height?",
        subtitle: "We'll use this to calculate your metrics",
        type: "number",
        units: "inches",
        min: 36,
        max: 96,
        required: true,
      },
      {
        id: "weight_current",
        order: 3,
        title: "Current weight",
        subtitle: "Track your starting point",
        type: "number",
        units: "lbs",
        min: 50,
        max: 600,
        required: true,
      },
      {
        id: "age",
        order: 4,
        title: "How old are you?",
        subtitle: "Age helps personalize your fitness plan",
        type: "number",
        units: "years",
        min: 13,
        max: 100,
        required: true,
      },
      {
        id: "weekly_goal",
        order: 5,
        title: "Your fitness goal",
        subtitle: "Choose your target weight change per week",
        type: "single_select",
        required: true,
        options: [
          "Lose 1 lb/week (-500 kcal/day)",
          "Lose 0.5 lb/week (-250 kcal/day)",
          "Maintain Weight (No change)",
          "Gain 0.5 lb/week (+250 kcal/day)",
          "Gain 1 lb/week (+500 kcal/day)",
        ],
      },
      {
        id: "workout_preferences",
        order: 6,
        title: "Workout preferences",
        subtitle: "Select your preferred workout styles (Choose one or more)",
        type: "multi_select",
        required: false,
        options: ["CrossFit", "Pilates", "Weight Lifting", "HIIT", "Bodybuilding", "Yoga"],
      },
      {
        id: "skill_level",
        order: 7,
        title: "Workout skill level",
        subtitle: "Help us match the right intensity",
        type: "single_select",
        required: true,
        options: ["Beginner", "Intermediate", "Advanced"],
      },
      {
        id: "primary_target",
        order: 8,
        title: "Fitness target",
        subtitle: "What's your primary goal?",
        type: "single_select",
        required: true,
        options: ["Weight Loss", "Muscle Gain", "Strength", "General Fitness"],
      },
      {
        id: "weight_target",
        order: 9,
        title: "Target Weight",
        subtitle: "Set the weight you want to achieve",
        type: "number",
        units: "lbs",
        min: 50,
        max: 600,
        required: false,
      },
      {
        id: "goal_duration",
        order: 10,
        title: "Goal Duration",
        subtitle: "How long do you want to reach your goal?",
        type: "single_select",
        required: true,
        options: ["8 Weeks", "12 Weeks", "16 Weeks", "24 Weeks"],
      },
      {
        id: "workout_frequency",
        order: 11,
        title: "Workout Frequency",
        subtitle: "How many days per week can you train?",
        type: "single_select",
        required: true,
        options: ["3 Days", "4 Days", "5 Days", "6+ Days"],
      },
      {
        id: "last_workout",
        order: 12,
        title: "Last Workout",
        subtitle: "When did you last work out?",
        type: "single_select",
        required: false,
        options: ["Within the last week", "Within the last month", "Within 6 months", "Never or over a year"],
      },
      {
        id: "training_location",
        order: 13,
        title: "Training Location",
        subtitle: "Where do you plan to train?",
        type: "single_select",
        required: true,
        options: ["Home Workouts", "Gym Training"],
      },
    ],
  };
}

function normalizeFlow(flow) {
  const steps = Array.isArray(flow?.steps) ? flow.steps : [];
  const normalized = steps
    .map((s, idx) => ({
      id: String(s?.id || makeId("step")),
      order: Number.isFinite(Number(s?.order)) ? Number(s.order) : idx + 1,
      title: String(s?.title ?? ""),
      subtitle: String(s?.subtitle ?? ""),
      type: STEP_TYPES.some((t) => t.id === s?.type) ? s.type : "single_select",
      required: s?.required === false ? false : true,
      options: Array.isArray(s?.options) ? s.options.map((o) => String(o)) : [],
      units: s?.units != null ? String(s.units) : "",
      min: s?.min != null && s.min !== "" ? Number(s.min) : undefined,
      max: s?.max != null && s.max !== "" ? Number(s.max) : undefined,
    }))
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ ...s, order: i + 1 }));

  return {
    version: Number.isFinite(Number(flow?.version)) ? Number(flow.version) : 1,
    name: String(flow?.name ?? "Onboarding"),
    steps: normalized,
  };
}

function JsonModal({ open, isMounted, title, value, onClose, onApply }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setText(value ?? "");
    setErr("");
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="surface-card w-[94%] max-w-3xl p-4 md:p-5 shadow-[var(--shadow-premium)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Paste JSON and click Apply.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted/40"
            aria-label="Close"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[360px] font-mono text-xs"
            placeholder='{"version":1,"name":"Onboarding","steps":[...]}'
          />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                try {
                  const parsed = JSON.parse(text);
                  onApply?.(parsed);
                } catch (e) {
                  setErr(e?.message || "Invalid JSON");
                }
              }}
            >
              Apply JSON
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AdminOnboardingPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const deleteStepLockRef = useRef(false);
  const clearDraftLockRef = useRef(false);
  const resetLockRef = useRef(false);
  const saveLockRef = useRef(false);
  const [flow, setFlow] = useState(() => normalizeFlow(defaultFlowFromPdf()));
  const [selectedStepId, setSelectedStepId] = useState(flow.steps?.[0]?.id ?? null);

  useEffect(() => setIsMounted(true), []);

  const selectedStep = useMemo(
    () => flow.steps.find((s) => s.id === selectedStepId) ?? flow.steps[0] ?? null,
    [flow.steps, selectedStepId]
  );

  const flowJson = useMemo(() => JSON.stringify(flow, null, 2), [flow]);

  const persistDraft = (next) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const fetchFromApi = async () => {
    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!baseUrl || !token) return null;

    // Try a few common route names; backend may differ.
    const paths = [
      "/api/admin/get-onboarding",
      "/api/admin/get-onboarding-flow",
      "/api/admin/getOnboarding",
    ];

    for (const p of paths) {
      try {
        const res = await axios.get(`${baseUrl}${p}`, { headers: { token }, timeout: 30000 });
        const payload = res?.data ?? {};
        const data = payload?.result ?? payload?.data ?? payload;
        if (payload?.success === false) continue;
        if (data?.steps) return data;
      } catch {
        // wrong route / not available
      }
    }
    return null;
  };

  const saveToApi = async (nextFlow) => {
    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!baseUrl) throw new Error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
    if (!token) throw new Error("Session expired. Please login again.");

    const paths = [
      "/api/admin/save-onboarding",
      "/api/admin/save-onboarding-flow",
      "/api/admin/saveOnboarding",
    ];

    const fd = new FormData();
    fd.append("onboardingFlow", JSON.stringify(nextFlow));
    fd.append("flow", JSON.stringify(nextFlow));

    let lastErr;
    for (const p of paths) {
      try {
        const res = await axios.post(`${baseUrl}${p}`, fd, { headers: { token }, timeout: 30000 });
        const payload = res?.data ?? {};
        if (payload?.success === false) {
          lastErr = new Error(payload?.message || "Save failed");
          continue;
        }
        return res;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error("Save failed");
  };

  useEffect(() => {
    const boot = async () => {
      const draft = loadDraft();
      if (draft?.steps) {
        const normalized = normalizeFlow(draft);
        setFlow(normalized);
        setSelectedStepId(normalized.steps?.[0]?.id ?? null);
        return;
      }

      setIsLoading(true);
      try {
        const apiFlow = await fetchFromApi();
        if (apiFlow?.steps) {
          const normalized = normalizeFlow(apiFlow);
          setFlow(normalized);
          setSelectedStepId(normalized.steps?.[0]?.id ?? null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    boot();
  }, []);

  const updateStep = (id, patch) => {
    setFlow((prev) => {
      const next = {
        ...prev,
        steps: prev.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      };
      const normalized = normalizeFlow(next);
      persistDraft(normalized);
      return normalized;
    });
  };

  const addStep = () => {
    const id = makeId("step");
    setFlow((prev) => {
      const next = normalizeFlow({
        ...prev,
        steps: [
          ...prev.steps,
          {
            id,
            order: prev.steps.length + 1,
            title: "New step",
            subtitle: "",
            type: "single_select",
            required: true,
            options: ["Option 1", "Option 2"],
          },
        ],
      });
      persistDraft(next);
      return next;
    });
    setSelectedStepId(id);
  };

  const deleteStep = (id) => {
    setFlow((prev) => {
      const next = normalizeFlow({ ...prev, steps: prev.steps.filter((s) => s.id !== id) });
      persistDraft(next);
      return next;
    });
    setSelectedStepId((cur) => {
      if (cur !== id) return cur;
      return flow.steps.find((s) => s.id !== id)?.id ?? null;
    });
  };

  const moveStep = (id, dir) => {
    setFlow((prev) => {
      const idx = prev.steps.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const nextSteps = [...prev.steps];
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= nextSteps.length) return prev;
      const a = nextSteps[idx];
      const b = nextSteps[swapWith];
      nextSteps[idx] = { ...b };
      nextSteps[swapWith] = { ...a };
      // Important: normalizeFlow sorts by `order`, so we must update the order values
      // to match the new array sequence; otherwise it will sort back to the old order.
      const reOrdered = nextSteps.map((s, i) => ({ ...s, order: i + 1 }));
      const next = normalizeFlow({ ...prev, steps: reOrdered });
      persistDraft(next);
      return next;
    });
  };

  const resetToDefault = () => {
    if (resetLockRef.current) return;
    resetLockRef.current = true;
    window.setTimeout(() => {
      resetLockRef.current = false;
    }, 400);

    const next = normalizeFlow(defaultFlowFromPdf());
    setFlow(next);
    setSelectedStepId(next.steps?.[0]?.id ?? null);
    persistDraft(next);
    toast.success("Reset to default onboarding flow.", { id: "onboarding-reset-success" });
  };

  const clearDraftOnly = () => {
    if (clearDraftLockRef.current) return;
    clearDraftLockRef.current = true;
    window.setTimeout(() => {
      clearDraftLockRef.current = false;
    }, 400);

    try {
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Local draft cleared.", { id: "onboarding-clear-draft-success" });
    } catch {
      toast.error("Could not clear local draft.", { id: "onboarding-clear-draft-failed" });
    }
  };

  const onSave = async () => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    window.setTimeout(() => {
      saveLockRef.current = false;
    }, 400);

    const next = normalizeFlow(flow);
    persistDraft(next);
    setIsSaving(true);
    try {
      await saveToApi(next);
      toast.success("Onboarding flow saved.", { id: "onboarding-save-success" });
    } catch (e) {
      console.error("Save onboarding failed:", e?.response?.data || e?.message);
      toast.error(e?.response?.data?.message || e?.message || "Save failed", { id: "onboarding-save-failed" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminHeaderCard
        title="Onboarding"
        subtitle="Create and manage the user onboarding steps shown in the mobile app."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={resetToDefault} disabled={isSaving || isLoading}>
              Reset default
            </Button>
            <Button onClick={onSave} disabled={isSaving || isLoading}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      />

      <div className="surface-card p-4 md:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6">
          <div className="md:col-span-4 md:sticky md:top-4 md:self-start">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Steps</p>
              <Button size="sm" onClick={addStep}>
                <HiOutlinePlus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="mt-3 space-y-2 md:max-h-[calc(100vh-16rem)] md:overflow-auto md:pr-1">
              {flow.steps.map((s) => {
                const active = s.id === selectedStepId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStepId(s.id)}
                    className={`group w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      active
                        ? "border-primary/60 bg-primary/10 shadow-sm"
                        : "border-border bg-background hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {s.order}. {s.title || "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.type.replace(/_/g, " ")}
                          {s.required ? " • required" : ""}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg border border-border bg-background hover:bg-muted/40"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveStep(s.id, "up");
                          }}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg border border-border bg-background hover:bg-muted/40"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveStep(s.id, "down");
                          }}
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!flow.steps.length ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No steps yet. Click “Add”.
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={clearDraftOnly}>
                Clear local draft
              </Button>
            </div>
          </div>

          <div className="md:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Editor</p>
              {selectedStep ? (
                <div className="text-xs text-muted-foreground">
                  Editing step <span className="font-semibold text-foreground">#{selectedStep.order}</span>
                </div>
              ) : null}
            </div>
            {selectedStep ? (
              <div className="mt-3 space-y-4 rounded-xl border border-border bg-background p-4 md:p-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step ID</p>
                    <Input
                      value={selectedStep.id}
                      onChange={(e) => updateStep(selectedStep.id, { id: e.target.value.trim() || selectedStep.id })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Keep this stable (app mapping depends on it).
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</p>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={selectedStep.type}
                      onChange={(e) => updateStep(selectedStep.id, { type: e.target.value })}
                    >
                      {STEP_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</p>
                  <Input
                    value={selectedStep.title}
                    onChange={(e) => updateStep(selectedStep.id, { title: e.target.value })}
                    placeholder="e.g., What's your height?"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subtitle</p>
                  <Input
                    value={selectedStep.subtitle}
                    onChange={(e) => updateStep(selectedStep.id, { subtitle: e.target.value })}
                    placeholder="Short helper text (optional)"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <label className="md:col-span-3 flex items-center gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!selectedStep.required}
                      onChange={(e) => updateStep(selectedStep.id, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  {(selectedStep.type === "number" || selectedStep.type === "text") ? (
                    <div className="md:col-span-9 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Units</p>
                        <Input
                          value={selectedStep.units ?? ""}
                          onChange={(e) => updateStep(selectedStep.id, { units: e.target.value })}
                          placeholder="e.g., lbs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Min</p>
                        <Input
                          value={selectedStep.min ?? ""}
                          onChange={(e) => updateStep(selectedStep.id, { min: e.target.value })}
                          placeholder="e.g., 13"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Max</p>
                        <Input
                          value={selectedStep.max ?? ""}
                          onChange={(e) => updateStep(selectedStep.id, { max: e.target.value })}
                          placeholder="e.g., 100"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {selectedStep.type === "single_select" || selectedStep.type === "multi_select" ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Options (one per line)</p>
                    <Textarea
                      value={(selectedStep.options ?? []).join("\n")}
                      onChange={(e) =>
                        updateStep(selectedStep.id, {
                          options: e.target.value
                            .split("\n")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        })
                      }
                      className="min-h-[160px]"
                      placeholder={"Option 1\nOption 2"}
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Order: <span className="font-semibold text-foreground">{selectedStep.order}</span>
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (deleteStepLockRef.current) return;
                      deleteStepLockRef.current = true;
                      window.setTimeout(() => {
                        deleteStepLockRef.current = false;
                      }, 400);

                      if (flow.steps.length <= 1) {
                        toast.error("You must keep at least 1 step.", { id: "onboarding-delete-step-min-one" });
                        return;
                      }
                      deleteStep(selectedStep.id);
                      toast.success("Step deleted.", { id: "onboarding-delete-step-success" });
                    }}
                  >
                    <HiOutlineTrash className="mr-2 h-4 w-4" />
                    Delete step
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Select a step to edit.
              </div>
            )}

            {/* <details className="mt-4 rounded-xl border border-border bg-muted/10 p-4">
              <summary className="cursor-pointer select-none text-sm font-semibold text-foreground">
                Advanced
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Use JSON only if you know the schema. Most edits can be done with the form above.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setJsonOpen(true)} disabled={!isMounted}>
                    <HiOutlinePencil className="mr-2 h-4 w-4" />
                    Edit JSON
                  </Button>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">JSON (read-only preview)</p>
                  <pre className="mt-2 max-h-[260px] overflow-auto rounded-lg border border-border bg-background p-3 text-xs">
                    {flowJson}
                  </pre>
                </div>
              </div>
            </details> */}
          </div>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading saved onboarding flow (if available)…</p>
        ) : null}
      </div>

      <JsonModal
        open={jsonOpen}
        isMounted={isMounted}
        title="Edit onboarding JSON"
        value={flowJson}
        onClose={() => setJsonOpen(false)}
        onApply={(parsed) => {
          const next = normalizeFlow(parsed);
          setFlow(next);
          setSelectedStepId(next.steps?.[0]?.id ?? null);
          persistDraft(next);
          setJsonOpen(false);
          toast.success("JSON applied to editor (saved as local draft).");
        }}
      />
    </div>
  );
}

