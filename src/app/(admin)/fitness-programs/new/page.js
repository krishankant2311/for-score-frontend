"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  appendProgramFields,
  decodeEmailFromJwt,
  prepareWorkoutsMediaUploads,
  prepareWorkoutMetaThumbnails,
  validateFitnessProgramForSave,
  workoutsHaveUnresolvedBlobMedia,
} from "@/lib/fitnessProgramApi";
import { Button } from "@/components/ui/button";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { MdFitnessCenter } from "react-icons/md";
import { createEmptyProgramDetailForId } from "../data";
import FitnessProgramEditorForm from "../components/FitnessProgramEditorForm";

export default function NewFitnessProgramPage() {
  const router = useRouter();
  const [draft, setDraft] = useState(() => createEmptyProgramDetailForId("new"));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const saveErr = validateFitnessProgramForSave(draft);
    if (saveErr) {
      toast.error(saveErr);
      return;
    }

    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

    if (!baseUrl) {
      toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
      return;
    }
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setIsSaving(true);
    try {
      const emailFromToken = decodeEmailFromJwt(token);
      const workoutsForSave = await prepareWorkoutsMediaUploads(draft.workouts);
      const workoutsMetaForSave = await prepareWorkoutMetaThumbnails(draft.workoutsMeta);
      if (workoutsHaveUnresolvedBlobMedia(workoutsForSave)) {
        toast.error(
          "Workout media could not be read for upload. Remove the previews, re-upload the video, then save again."
        );
        return;
      }
      const payloadForSave = { ...draft, workouts: workoutsForSave, workoutsMeta: workoutsMetaForSave };

      const buildFormData = () => {
        const formData = new FormData();
        appendProgramFields(formData, payloadForSave);
        if (emailFromToken) {
          formData.append("email", emailFromToken);
        }
        return formData;
      };

      const authHeaders = {
        token,
        Authorization: `Bearer ${token}`,
      };

      const postProgram = (path) =>
        axios.post(`${baseUrl}${path}`, buildFormData(), { headers: authHeaders });

      let res;
      try {
        res = await postProgram("/api/admin/add-programs");
      } catch (firstErr) {
        if (firstErr?.response?.status === 404) {
          res = await postProgram("/api/admin/add-program");
        } else {
          throw firstErr;
        }
      }

      const data = res?.data ?? {};
      const failed =
        data.success === false ||
        (typeof data.statusCode === "number" && data.statusCode >= 400);

      if (failed) {
        toast.error(data.message || "Failed to save program");
        return;
      }

      toast.success(data.message || "Program saved.");
      router.push("/fitness-programs");
    } catch (err) {
      console.error("Add program failed:", err?.response?.data || err?.message);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message ||
        "Failed to save program";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 min-h-[80vh] px-2 py-6 sm:px-4 sm:py-8">
      <header className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => router.push("/fitness-programs")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#C8D7E9] bg-white text-[#0A3161] hover:bg-[#F2F5FA] transition-colors shadow-sm"
          aria-label="Back to programs"
        >
          <HiOutlineArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A3161] text-white shadow-md">
            <MdFitnessCenter className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[#0A3161] tracking-tight">Add program</h1>
            <p className="text-sm text-[#5671A6] mt-0.5">
              Four steps — <span className="text-[#2158A3]">Next</span> opens schedule, workouts, then recovery.
            </p>
          </div>
        </div>
      </header>

      <FitnessProgramEditorForm
        draft={draft}
        setDraft={setDraft}
        isSaving={isSaving}
        onCancel={() => router.push("/fitness-programs")}
        onSave={handleSave}
        saveLabel="Save program"
        wizardMode
      />
    </div>
  );
}
