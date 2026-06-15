"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { MdFitnessCenter } from "react-icons/md";
import { FaHeartbeat, FaLeaf } from "react-icons/fa";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";
import AdminPagination from "@/components/admin/AdminPagination";
import {
  getProgramDetail,
  MOCK_FITNESS_PROGRAMS,
  FOUNDATIONS_PROGRAM_ID,
  createEmptyProgramDetailForId,
} from "../data";
import {
  apiRowToEditorDraft,
  mapProgramFromApi,
  programCacheKey,
  programEditKey,
  fetchProgramRawById,
  coerceMultilineText,
} from "@/lib/fitnessProgramApi";

function BulletBlock({ title, text }) {
  const body = coerceMultilineText(text);
  if (!body.trim()) return null;
  const lines = body.split(/\n/).filter(Boolean);
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-2">{title}</h2>
      <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground leading-relaxed">
        {lines.map((line, i) => (
          <li key={i}>{line.replace(/^[●•]\s*/, "")}</li>
        ))}
      </ul>
    </div>
  );
}

function getLevelBadgeClass(level) {
  const key = String(level ?? "").toLowerCase();
  if (key.includes("beginner")) return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200";
  if (key.includes("intermediate")) return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  if (key.includes("advanced")) return "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200";
  return "border-border bg-muted/50 text-foreground";
}

function ExerciseReadCard({ ex, letter, index }) {
  const name = String(ex?.name ?? "").trim();
  if (!name) return null;

  const sets = ex.target_sets != null && ex.target_sets !== "" ? String(ex.target_sets) : null;
  const reps = ex.target_reps_range ? String(ex.target_reps_range) : null;
  const timeMin =
    ex.time_minutes != null && ex.time_minutes !== ""
      ? String(ex.time_minutes)
      : ex.estimated_time != null && ex.estimated_time !== ""
        ? String(ex.estimated_time)
        : null;
  const calories =
    ex.estimated_calories != null && ex.estimated_calories !== ""
      ? String(ex.estimated_calories)
      : null;
  const muscles =
    typeof ex.targetMusclesText === "string" && ex.targetMusclesText.trim()
      ? ex.targetMusclesText.trim()
      : Array.isArray(ex.target_muscles)
        ? ex.target_muscles.join(", ")
        : "";
  const instructionsRaw =
    typeof ex.instructionsText === "string" && ex.instructionsText.trim()
      ? ex.instructionsText.trim()
      : Array.isArray(ex.instructions)
        ? ex.instructions.join("\n")
        : "";
  const instLines = instructionsRaw
    ? instructionsRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    : [];

  return (
    <div className="rounded-xl border border-border/80 bg-background px-4 py-3.5 shadow-sm">
      <div className="flex flex-wrap items-start gap-2 gap-y-1">
        <span className="inline-flex h-8 min-w-[2.25rem] items-center justify-center rounded-lg bg-muted px-2 text-xs font-bold text-foreground">
          {letter}
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground leading-snug">{name}</p>
          {ex.tag ? (
            <span className="mt-1 inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
              {ex.tag}
            </span>
          ) : null}
        </div>
      </div>
      {(sets || reps || timeMin || calories || muscles) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {sets ? (
            <span>
              <span className="font-medium text-foreground/80">Sets</span> {sets}
            </span>
          ) : null}
          {reps ? (
            <span>
              <span className="font-medium text-foreground/80">Rep range</span> {reps}
            </span>
          ) : null}
          {timeMin ? (
            <span>
              <span className="font-medium text-foreground/80">Time</span> {timeMin} min
            </span>
          ) : null}
          {calories ? (
            <span>
              <span className="font-medium text-foreground/80">Est. calories</span> {calories}
            </span>
          ) : null}
        </div>
      )}
      {muscles ? (
        <p className="mt-2 text-sm">
          <span className="font-medium text-foreground/90">Target muscles </span>
          <span className="text-muted-foreground">{muscles}</span>
        </p>
      ) : null}
      {instLines.length > 0 ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Instructions</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            {instLines.map((line, i) => (
              <li key={i} className="leading-relaxed">
                {line}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function WorkoutLetterBlock({ letter, label, exercises }) {
  const list = Array.isArray(exercises) ? exercises : [];
  const filled = list.map((ex, i) => ({ ex, i })).filter(({ ex }) => String(ex?.name ?? "").trim());

  return (
    <div className="surface-card flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border bg-muted/40 px-4 py-3 md:px-5 shrink-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Exercises linked to this block in the app library.</p>
      </div>
      <div className="flex-1 min-h-0 space-y-2.5 p-4 md:p-5">
        {filled.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No exercises in this block.</p>
        ) : (
          filled.map(({ ex, i }) => <ExerciseReadCard key={i} ex={ex} letter={letter} index={i} />)
        )}
      </div>
    </div>
  );
}

const DEFAULT_STRETCHES_PER_PAGE = 5;

function RecoverySection({ recovery }) {
  const stretches = Array.isArray(recovery?.stretches) ? recovery.stretches : [];
  const [stretchPage, setStretchPage] = useState(1);
  const [stretchesPerPage, setStretchesPerPage] = useState(DEFAULT_STRETCHES_PER_PAGE);

  const totalStretchPages = Math.max(1, Math.ceil(stretches.length / stretchesPerPage));

  useEffect(() => {
    setStretchPage((p) => Math.min(p, totalStretchPages));
  }, [totalStretchPages, stretches.length, stretchesPerPage]);

  const stretchStart = (stretchPage - 1) * stretchesPerPage;
  const paginatedStretches = stretches.slice(stretchStart, stretchStart + stretchesPerPage);

  return (
    <section className="w-full min-w-0">
      <h2 className="text-base font-semibold text-foreground mb-4">Part 3 · Recovery</h2>
      <div className="grid w-full min-w-0 grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start lg:gap-6 xl:gap-8">
        <div className="flex min-w-0 flex-col surface-card overflow-hidden self-start">
          <div className="flex flex-wrap items-center gap-3 px-4 py-4 border-b border-border bg-gradient-to-r from-sky-50 via-background to-emerald-50/40 dark:from-sky-950/25 dark:to-emerald-950/15">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
              <FaHeartbeat className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                LISS cardio · {recovery.lissMinutes} min
              </h3>
              <p className="text-xs text-muted-foreground">Low-intensity session</p>
            </div>
          </div>
          <div className="p-4 md:p-5 space-y-3 text-sm text-muted-foreground">
            <p className="leading-relaxed whitespace-pre-wrap">{recovery.lissPrompt}</p>
            {recovery.lissOptions ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {recovery.lissOptions.split(",").map((opt) => {
                  const t = opt.trim();
                  if (!t) return null;
                  return (
                    <span
                      key={t}
                      className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col surface-card overflow-hidden self-start">
          <div className="flex flex-wrap items-center gap-3 px-4 py-4 border-b border-border bg-gradient-to-r from-emerald-50 via-background to-amber-50/35 dark:from-emerald-950/20 dark:to-amber-950/15">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-100">
              <FaLeaf className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Stretches</h3>
              <p className="text-xs text-muted-foreground">
                In order after cardio · {stretches.length} total
              </p>
            </div>
          </div>
          {stretches.length === 0 ? (
            <p className="p-4 md:p-5 text-sm text-muted-foreground italic">No stretches listed.</p>
          ) : (
            <>
              <ol className="p-4 md:p-5 space-y-3 list-none">
                {paginatedStretches.map((s, i) => {
                  const globalIndex = stretchStart + i;
                  return (
                    <li
                      key={`${globalIndex}-${s.name || "stretch"}`}
                      className="flex gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {globalIndex + 1}
                      </span>
                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-foreground">{s.name || "—"}</p>
                        <p className="text-muted-foreground mt-0.5">{s.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              {stretches.length > DEFAULT_STRETCHES_PER_PAGE ? (
                <div className="border-t border-border px-2 pb-2">
                  <AdminPagination
                    currentPage={stretchPage}
                    totalPages={totalStretchPages}
                    rowsPerPage={stretchesPerPage}
                    totalItems={stretches.length}
                    onPageChange={setStretchPage}
                    onRowsPerPageChange={(n) => {
                      setStretchesPerPage(n);
                      setStretchPage(1);
                    }}
                    rowOptions={[4, 5, 8, 10]}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ViewFitnessProgramPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [loaded, setLoaded] = useState(false);
  const [summary, setSummary] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!id) {
      setSummary(null);
      setDetail(null);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);

    const finish = (s, d) => {
      if (cancelled) return;
      setSummary(s);
      setDetail(d);
      setLoaded(true);
    };

    try {
      const cached = sessionStorage.getItem(programCacheKey(id));
      if (cached) {
        const raw = JSON.parse(cached);
        const empty = createEmptyProgramDetailForId(id);
        const d = apiRowToEditorDraft(raw, empty);
        const s = mapProgramFromApi(raw);
        finish(s, d);
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
          finish(mapProgramFromApi(found), apiRowToEditorDraft(found, empty));
          return;
        }
      }

      const mockSummary = MOCK_FITNESS_PROGRAMS.find((p) => p.id === id) ?? null;
      const mockDetail = getProgramDetail(id);
      finish(mockSummary, mockDetail);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const title = detail?.title ?? summary?.title ?? "Program";
  const subHeader = detail?.subHeader ?? summary?.subHeader;

  const meta = useMemo(() => {
    const d = detail ?? {};
    const s = summary ?? {};
    return {
      level: d.level ?? s.level ?? "—",
      durationWeeks: d.durationWeeks ?? s.durationWeeks ?? 1,
      frequencyPerWeek: d.frequencyPerWeek ?? s.frequencyPerWeek ?? 1,
      avgSessionMinutes: d.avgSessionMinutes ?? s.avgSessionMinutes ?? 1,
      status: d.status ?? s.status ?? "—",
      frequencyCaption: d.frequencyCaption ?? "",
      locationTag: d.locationTag ?? s.locationTag ?? "",
      primaryGoal: d.primaryGoal ?? "",
      updatedAt: s.updatedAt,
    };
  }, [detail, summary]);

  const goToEdit = () => {
    try {
      const c = sessionStorage.getItem(programCacheKey(id));
      if (c) sessionStorage.setItem(programEditKey(id), c);
      else if (summary?._raw) {
        sessionStorage.setItem(programEditKey(id), JSON.stringify(summary._raw));
      }
    } catch {
      /* ignore */
    }
    router.push(`/fitness-programs/${id}/edit`);
  };

  if (!loaded) {
    return (
      <div className="w-full min-h-[40vh] py-8 sm:py-12">
        <div className="animate-pulse space-y-4 w-full">
          <div className="h-10 bg-muted rounded-lg w-full max-w-md" />
          <div className="h-36 bg-muted rounded-2xl w-full" />
        </div>
      </div>
    );
  }

  if (!summary && !detail && loaded) {
    return (
      <div className="flex w-full min-h-[50vh] justify-center px-2 py-16">
        <div className="w-full max-w-lg text-center">
          <div className="surface-card w-full p-8">
            <p className="text-foreground mb-2 font-medium">Program not found</p>
            <p className="text-sm text-muted-foreground mb-6">This program could not be loaded.</p>
            <Button onClick={() => router.push("/fitness-programs")}>Back to programs</Button>
          </div>
        </div>
      </div>
    );
  }

  const showCatalogHint = !detail && summary;
  const hasSchedule = Boolean(detail?.schedule?.length);
  const hasWorkouts = Boolean(detail?.workouts);

  return (
    <div className="w-full min-w-0 min-h-[80vh] py-4 sm:py-6">
      <div className="mb-4 sm:mb-6 flex w-full min-w-0 flex-wrap items-start gap-3">
        <button
          type="button"
          onClick={() => router.push("/fitness-programs")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted/80 transition-colors shadow-sm"
          aria-label="Back to programs"
        >
          <HiOutlineArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <MdFitnessCenter className="h-6 w-6" />
        </div>
      </div>

      <AdminHeaderCard
        className="w-full min-w-0"
        title={title}
        subtitle={
          subHeader ? (
            <span className="line-clamp-3">{subHeader}</span>
          ) : (
            "Fitness program · admin preview"
          )
        }
        stats={
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span
              className={[
                "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                getLevelBadgeClass(meta.level),
              ].join(" ")}
            >
              {meta.level}
            </span>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                meta.status === "Active"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {meta.status}
            </span>
            {meta.updatedAt && meta.updatedAt !== "—" ? (
              <span className="text-xs text-muted-foreground">Updated {meta.updatedAt}</span>
            ) : null}
          </div>
        }
        actions={
          <div className="flex w-full min-w-0 flex-wrap gap-2 justify-end sm:w-auto">
            <Button variant="outline" type="button" className="min-w-0 shrink" onClick={() => router.push("/fitness-programs")}>
              List
            </Button>
            <Button type="button" className="min-w-0 shrink" onClick={goToEdit}>
              Edit program
            </Button>
          </div>
        }
      />

      {showCatalogHint && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">Catalog entry only</p>
          <p className="mt-1 opacity-95">
            Full schedule, workouts, and recovery for this title may live in your source spec. Only{" "}
            <strong className="font-semibold">28-Day Full Body Foundations</strong> ships with a full mock in this
            admin build. Fetch from the API for complete data.
          </p>
        </div>
      )}

      <div className="mt-6 sm:mt-8 w-full min-w-0 space-y-6 sm:space-y-8">
        <section className="surface-card w-full min-w-0 p-4 sm:p-6 md:p-8">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-6 md:mb-8">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{meta.durationWeeks} weeks</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Freq. / week</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{meta.frequencyPerWeek} days</p>
              {meta.frequencyCaption ? (
                <p className="mt-1 text-xs text-muted-foreground leading-snug">{meta.frequencyCaption}</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avg. session</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{meta.avgSessionMinutes} min</p>
            </div>
            {meta.primaryGoal ? (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 sm:col-span-2 xl:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primary goal</p>
                <p className="mt-1 text-sm font-medium text-foreground">{meta.primaryGoal}</p>
              </div>
            ) : null}
          </div>

          {meta.locationTag ? (
            <div className="mb-6 rounded-lg border border-dashed border-border px-4 py-3 bg-muted/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</p>
              <p className="mt-1 text-sm text-foreground">{meta.locationTag}</p>
            </div>
          ) : null}

          {detail?.overview ? (
            <div className="mb-8">
              <h2 className="text-base font-semibold text-foreground mb-3">Overview</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{detail.overview}</div>
            </div>
          ) : null}

          {detail && (
            <>
              <div className="grid gap-6 md:gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
                <BulletBlock title="What's inside" text={detail.whatsInside} />
                <BulletBlock title="Is this for you?" text={detail.isThisForYou} />
              </div>
              {detail.theGoal ? (
                <div className="mt-8">
                  <h2 className="text-base font-semibold text-foreground mb-3">The goal</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{detail.theGoal}</p>
                </div>
              ) : null}

              {(detail.equipment || detail.equipmentNote) && (
                <div className="mt-8 pt-6 border-t border-border">
                  <h2 className="text-base font-semibold text-foreground mb-3">Equipment</h2>
                  {detail.equipment ? (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{detail.equipment}</p>
                  ) : null}
                  {detail.equipmentNote ? (
                    <p className="mt-3 text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                      {detail.equipmentNote}
                    </p>
                  ) : null}
                </div>
              )}
            </>
          )}
        </section>

        {hasSchedule && (
          <section className="surface-card w-full min-w-0 overflow-hidden">
            <div className="border-b border-border bg-gradient-to-r from-muted/50 via-background to-background px-4 py-4 md:px-6">
              <h2 className="text-base font-semibold text-foreground">Part 1 · Logic grid</h2>
              <p className="text-xs text-muted-foreground mt-1">Week × day labels used with the app schedule.</p>
            </div>
            <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain p-3 md:p-4 lg:p-5">
              <Table className="w-full min-w-[900px] xl:min-w-0 xl:table-fixed">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="sticky left-0 z-10 bg-muted/50 font-semibold text-foreground w-12 px-2">
                      Wk
                    </TableHead>
                    <TableHead className="text-foreground font-semibold min-w-[7rem] px-2">Mon</TableHead>
                    <TableHead className="text-foreground font-semibold min-w-[7rem] px-2">Tue</TableHead>
                    <TableHead className="text-foreground font-semibold min-w-[7rem] px-2">Wed</TableHead>
                    <TableHead className="text-foreground font-semibold min-w-[7rem] px-2">Thu</TableHead>
                    <TableHead className="text-foreground font-semibold min-w-[7rem] px-2">Fri</TableHead>
                    <TableHead className="text-foreground font-semibold min-w-[7rem] px-2">Sat</TableHead>
                    <TableHead className="text-foreground font-semibold min-w-[7rem] px-2">Sun</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.schedule.map((row, ri) => {
                    const rowBg = ri % 2 === 1 ? "bg-muted/25" : "bg-background";
                    return (
                    <TableRow key={row.week ?? ri} className={rowBg}>
                      <TableCell
                        className={`sticky left-0 z-10 font-semibold text-foreground px-2 py-2.5 shadow-[2px_0_0_0_hsl(var(--border))] ${rowBg}`}
                      >
                        W{row.week}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground px-2 py-2.5 align-top whitespace-pre-wrap break-words max-w-[200px] xl:max-w-none xl:min-w-0">
                        {row.mon}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground px-2 py-2.5 align-top break-words">{row.tue}</TableCell>
                      <TableCell className="text-sm text-muted-foreground px-2 py-2.5 align-top whitespace-pre-wrap break-words max-w-[200px] xl:max-w-none xl:min-w-0">
                        {row.wed}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground px-2 py-2.5 align-top break-words">{row.thu}</TableCell>
                      <TableCell className="text-sm text-muted-foreground px-2 py-2.5 align-top whitespace-pre-wrap break-words max-w-[200px] xl:max-w-none xl:min-w-0">
                        {row.fri}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground px-2 py-2.5 align-top break-words xl:min-w-0">
                        {row.sat ?? ""}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground px-2 py-2.5 align-top break-words xl:min-w-0">
                        {row.sun ?? ""}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {hasWorkouts && (
          <section className="w-full min-w-0 space-y-3">
            <h2 className="text-base font-semibold text-foreground">Part 2 · Workout library</h2>
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 xl:grid-cols-3 xl:items-start xl:gap-5">
              <WorkoutLetterBlock
                letter="A"
                label="Workout A (e.g. lower / Monday)"
                exercises={detail.workouts.A}
              />
              <WorkoutLetterBlock
                letter="B"
                label="Workout B (e.g. upper / Wednesday)"
                exercises={detail.workouts.B}
              />
              <WorkoutLetterBlock
                letter="C"
                label="Workout C (e.g. full body / Friday)"
                exercises={detail.workouts.C}
              />
            </div>
          </section>
        )}

        {detail?.recovery && <RecoverySection recovery={detail.recovery} />}

        {!hasSchedule && !hasWorkouts && detail && id !== FOUNDATIONS_PROGRAM_ID && (
          <p className="text-sm text-muted-foreground text-center py-6 rounded-xl border border-dashed border-border bg-muted/20">
            Schedule and workout blocks will appear here when this program is fully saved from the editor or returned by
            the API.
          </p>
        )}

        {detail?.implementationNote && (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Developer note</p>
            <p className="leading-relaxed text-muted-foreground">{detail.implementationNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}
