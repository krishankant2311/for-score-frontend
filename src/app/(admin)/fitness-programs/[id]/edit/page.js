"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { MdFitnessCenter } from "react-icons/md";
import { getProgramDetail, createEmptyProgramDetailForId } from "../../data";
import FitnessProgramEditorForm from "../../components/FitnessProgramEditorForm";
import {
  apiRowToEditorDraft,
  appendProgramFields,
  decodeEmailFromJwt,
  mergePendingWorkoutsFromPrevious,
  prepareWorkoutsMediaUploads,
  prepareWorkoutMetaThumbnails,
  programEditKey,
  fetchProgramRawById,
  validateFitnessProgramForSave,
  workoutsHaveUnresolvedBlobMedia,
} from "@/lib/fitnessProgramApi";

export default function EditFitnessProgramPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [draft, setDraft] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoaded(false);

    const applyDraft = (d, { preservePending = false } = {}) => {
      if (cancelled) return;
      setDraft((prev) => {
        const next = d ? JSON.parse(JSON.stringify(d)) : null;
        if (!next) return null;
        return preservePending && prev ? mergePendingWorkoutsFromPrevious(prev, next) : next;
      });
      setLoaded(true);
    };

    try {
      const cached = sessionStorage.getItem(programEditKey(id));
      if (cached) {
        const raw = JSON.parse(cached);
        const empty = createEmptyProgramDetailForId(id);
        // Use cached data as fast placeholder, but still fetch full detail by id.
        applyDraft(apiRowToEditorDraft(raw, empty));
      }
    } catch {
      /* ignore */
    }

    (async () => {
      const token = localStorage.getItem("token");
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

      if (baseUrl && token) {
        const found = await fetchProgramRawById(id, { token, baseUrl });
        if (found) {
          const empty = createEmptyProgramDetailForId(id);
          applyDraft(apiRowToEditorDraft(found, empty), { preservePending: true });
          return;
        }
      }

      const mock = getProgramDetail(id);
      if (mock) {
        applyDraft(mock);
        return;
      }

      applyDraft(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const titleLine = useMemo(() => draft?.title || "Program", [draft]);

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

      const putUpdate = (path) =>
        axios.post(`${baseUrl}${path}`, buildFormData(), { headers: authHeaders });

      let res;
      try {
        res = await putUpdate(`/api/admin/update-programs/${encodeURIComponent(id)}`);
      } catch (firstErr) {
        if (firstErr?.response?.status === 404) {
          res = await putUpdate(`/api/admin/update-program/${encodeURIComponent(id)}`);
        } else {
          throw firstErr;
        }
      }

      const data = res?.data ?? {};
      const failed =
        data.success === false ||
        (typeof data.statusCode === "number" && data.statusCode >= 400);

      if (failed) {
        toast.error(data.message || "Failed to update program");
        return;
      }

      try {
        sessionStorage.removeItem(programEditKey(id));
      } catch {
        /* ignore */
      }

      toast.success(data.message || "Program updated.");
      router.push("/fitness-programs");
    } catch (err) {
      console.error("Update program failed:", err?.response?.data || err?.message);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message ||
        "Failed to update program";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="w-full min-w-0 min-h-[50vh] py-8 sm:py-12">
        <div className="animate-pulse w-full space-y-4">
          <div className="h-10 max-w-md rounded bg-slate-200" />
          <div className="h-12 w-full rounded bg-slate-200" />
          <div className="h-40 w-full rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex w-full min-w-0 justify-center px-2 py-16 text-center">
        <div className="w-full max-w-lg rounded-2xl border border-[#C8D7E9] bg-white p-8 shadow-sm">
          <p className="text-[#2158A3] mb-2 font-medium">Program not found</p>
          <p className="text-sm text-[#5671A6] mb-6">This ID is not in the preview data.</p>
          <Button className="bg-[#0A3161] hover:bg-[#0D3D7A]" onClick={() => router.push("/fitness-programs")}>
            Back to programs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 min-h-[80vh] py-4 sm:py-8">
      <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => router.push("/fitness-programs")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C8D7E9] bg-white text-[#0A3161] hover:bg-[#F2F5FA] transition-colors shadow-sm"
            aria-label="Back"
          >
            <HiOutlineArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A3161] text-white shadow-md">
              <MdFitnessCenter className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-[#0A3161] leading-6 whitespace-normal break-words">
                {titleLine}
              </h1>
              <p className="text-sm text-[#2158A3] whitespace-normal break-words">
                Edit program · <span className="font-mono text-xs text-[#5671A6]">{id}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <FitnessProgramEditorForm
        draft={draft}
        setDraft={setDraft}
        isSaving={isSaving}
        onCancel={() => router.push("/fitness-programs")}
        onSave={handleSave}
        saveLabel="Save changes"
      />
    </div>
  );
}
