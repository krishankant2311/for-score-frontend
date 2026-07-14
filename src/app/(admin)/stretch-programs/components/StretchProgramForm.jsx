"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HiOutlineTrash, HiPlus } from "react-icons/hi";
import { STRETCH_LEVELS, STRETCH_STATUSES, STRETCH_PROGRAM_TEMPLATES, EMPTY_MOVEMENT } from "../data";

export default function StretchProgramForm({
  form,
  setForm,
  onSubmit,
  submitLabel = "Save",
  isSaving = false,
  showTemplates = false,
}) {
  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateMovement = (index, field, value) => {
    setForm((prev) => {
      const movements = [...(prev.movements || [])];
      movements[index] = { ...movements[index], [field]: value };
      return { ...prev, movements };
    });
  };

  const addMovement = () => {
    setForm((prev) => {
      const movements = [...(prev.movements || [])];
      movements.push({
        ...EMPTY_MOVEMENT,
        sequenceOrder: movements.length + 1,
      });
      return { ...prev, movements };
    });
  };

  const removeMovement = (index) => {
    setForm((prev) => {
      const movements = (prev.movements || []).filter((_, i) => i !== index);
      return {
        ...prev,
        movements: movements.length
          ? movements.map((m, idx) => ({ ...m, sequenceOrder: idx + 1 }))
          : [{ ...EMPTY_MOVEMENT }],
      };
    });
  };

  const loadTemplate = (template) => {
    setForm({
      title: template.title,
      category: template.category,
      description: template.description || "",
      intro: template.intro,
      durationMinutes: String(template.durationMinutes),
      level: template.level,
      status: "Active",
      sortOrder: "0",
      movements: template.movements.map((m) => ({ ...m })),
    });
  };

  return (
    <div className="space-y-6">
      {showTemplates ? (
        <div className="rounded-2xl border border-[#C8D7E9] bg-[#F2F5FA] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5671A6]">Load client template</p>
          <p className="mt-1 text-sm text-[#2158A3]">Pre-fill the form with one of the provided Recover programs.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STRETCH_PROGRAM_TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => loadTemplate(t)}
                className="rounded-full border border-[#C8D7E9] bg-white px-4 py-2 text-sm font-medium text-[#0A3161] hover:bg-[#E8EEF4]"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-[#0A3161]">Program title *</label>
          <Input
            className="mt-1.5 h-12"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Recover: 20-Minute Full-Body Reset"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#0A3161]">Category</label>
          <Input
            className="mt-1.5 h-12"
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            placeholder="Recover"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#0A3161]">Duration (minutes) *</label>
          <Input
            className="mt-1.5 h-12"
            type="number"
            min={1}
            value={form.durationMinutes}
            onChange={(e) => updateField("durationMinutes", e.target.value.replace(/[^\d]/g, ""))}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#0A3161]">Level</label>
          <select
            className="mt-1.5 h-12 w-full rounded-md border border-[#C8D7E9] bg-white px-3 text-sm"
            value={form.level}
            onChange={(e) => updateField("level", e.target.value)}
          >
            {STRETCH_LEVELS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-[#0A3161]">Status</label>
          <select
            className="mt-1.5 h-12 w-full rounded-md border border-[#C8D7E9] bg-white px-3 text-sm"
            value={form.status}
            onChange={(e) => updateField("status", e.target.value)}
          >
            {STRETCH_STATUSES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-[#0A3161]">Sort order</label>
          <Input
            className="mt-1.5 h-12"
            value={form.sortOrder}
            onChange={(e) => updateField("sortOrder", e.target.value.replace(/[^\d]/g, ""))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-[#0A3161]">Short description (app card) *</label>
          <Textarea
            className="mt-1.5 min-h-20 resize-y"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Gentle stretches for desk workers and early risers to wake up your body"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-[#0A3161]">Program intro / coaching notes *</label>
          <Textarea
            className="mt-1.5 min-h-28 resize-y"
            value={form.intro}
            onChange={(e) => updateField("intro", e.target.value)}
            placeholder="Instructions for users (breathing, tension, pacing)…"
          />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#0A3161]">Movement sequence *</h3>
            <p className="text-xs text-[#5671A6]">Sequence, movement, target area, and time per step.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addMovement} className="gap-1">
            <HiPlus className="h-4 w-4" />
            Add movement
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#C8D7E9]">
          <table className="min-w-[960px] w-full text-sm">
            <thead className="bg-[#F2F5FA] text-left text-xs font-semibold uppercase tracking-wide text-[#2158A3]">
              <tr>
                <th className="px-3 py-3 w-14">#</th>
                <th className="px-3 py-3 min-w-[120px]">Sequence</th>
                <th className="px-3 py-3 min-w-[220px]">Movement</th>
                <th className="px-3 py-3 min-w-[180px]">Target area</th>
                <th className="px-3 py-3 min-w-[140px]">Time</th>
                <th className="px-3 py-3 w-14" />
              </tr>
            </thead>
            <tbody>
              {(form.movements || []).map((m, index) => (
                <tr key={index} className="border-t border-[#E8EEF4] align-top">
                  <td className="px-3 py-3">
                    <Input
                      className="h-10 w-14"
                      value={m.sequenceOrder}
                      onChange={(e) => updateMovement(index, "sequenceOrder", e.target.value.replace(/[^\d]/g, ""))}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      className="h-10"
                      value={m.sequenceLabel}
                      onChange={(e) => updateMovement(index, "sequenceLabel", e.target.value)}
                      placeholder="Grounding"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      className="h-10"
                      value={m.movementName}
                      onChange={(e) => updateMovement(index, "movementName", e.target.value)}
                      placeholder="Child's Pose with Lateral Reach"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      className="h-10"
                      value={m.targetArea}
                      onChange={(e) => updateMovement(index, "targetArea", e.target.value)}
                      placeholder="Lats, lower back, shoulders"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      className="h-10"
                      value={m.timeLabel}
                      onChange={(e) => updateMovement(index, "timeLabel", e.target.value)}
                      placeholder="3 minutes"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => removeMovement(index)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      aria-label="Remove movement"
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" className="bg-[#0A3161] hover:bg-[#0D3D7A]" onClick={onSubmit} disabled={isSaving}>
          {isSaving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
