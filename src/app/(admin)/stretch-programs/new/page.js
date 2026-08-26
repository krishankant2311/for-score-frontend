"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { FaRegHeart } from "react-icons/fa";
import StretchProgramForm from "../components/StretchProgramForm";
import { MAX_STRETCH_DURATION_MINUTES, MAX_STRETCH_MOVEMENT_TIME_MINUTES, mapProgramToFormState } from "../data";
import { buildStretchProgramPayload, createStretchProgram } from "@/lib/stretchProgramApi";

export default function NewStretchProgramPage() {
  const router = useRouter();
  const [form, setForm] = useState(() => mapProgramToFormState());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    const payload = buildStretchProgramPayload(form);
    const durationRaw = String(form.durationMinutes ?? "").trim();
    const duration = Number(durationRaw);

    if (!payload.title || !payload.intro || !payload.description) {
      toast.error("Title, short description, and intro are required", { id: "stretch-add-required" });
      return;
    }
    if (!durationRaw) {
      toast.error("Duration is required", { id: "stretch-add-duration-required" });
      return;
    }
    if (!/^\d+$/.test(durationRaw) || duration < 1) {
      toast.error("Duration must be a valid number of minutes", { id: "stretch-add-duration-invalid" });
      return;
    }
    if (duration > MAX_STRETCH_DURATION_MINUTES) {
      toast.error(`Duration cannot exceed ${MAX_STRETCH_DURATION_MINUTES} minutes`, {
        id: "stretch-add-duration-max",
      });
      return;
    }
    if (!payload.movements.length) {
      toast.error("Add at least one movement", { id: "stretch-add-movement" });
      return;
    }
    const invalidMovementTime = payload.movements.find((m) => {
      const raw = String(m.timeLabel ?? "").trim();
      const minutes = Number(raw);
      return !/^\d+$/.test(raw) || minutes < 1 || minutes > MAX_STRETCH_MOVEMENT_TIME_MINUTES;
    });
    if (invalidMovementTime) {
      toast.error(`Movement time must be numeric and between 1-${MAX_STRETCH_MOVEMENT_TIME_MINUTES} minutes`, {
        id: "stretch-add-movement-time-invalid",
      });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login again", { id: "stretch-add-token" });
      return;
    }

    setIsSaving(true);
    try {
      await createStretchProgram(payload, { token });
      toast.success("Stretch program added");
      router.push("/stretch-programs");
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-12 w-12 items-center justify-center rounded-lg border bg-white"
        >
          <HiOutlineArrowLeft />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A3161] text-white">
            <FaRegHeart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#0A3161]">Add Stretch Program</h1>
            <p className="text-sm text-[#2158A3]">Create a recover routine for the mobile app</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#C8D7E9] bg-white p-6 shadow-md">
        <StretchProgramForm
          form={form}
          setForm={setForm}
          onSubmit={handleSave}
          submitLabel="Add Stretch Program"
          isSaving={isSaving}
          showTemplates
        />
      </div>
    </div>
  );
}
