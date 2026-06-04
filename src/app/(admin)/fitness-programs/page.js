"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaRegEdit, FaRegEye } from "react-icons/fa";
import { HiOutlineTrash } from "react-icons/hi";
import { toast } from "react-hot-toast";
import {
  mapProgramFromApi,
  programCacheKey,
  programEditKey,
  extractProgramsFromListResponse,
  extractListMeta,
  deleteProgramById,
  isAdminApiErrorPayload,
  rawProgramExcludedFromAdminList,
} from "@/lib/fitnessProgramApi";
import { joinAdminPath } from "@/lib/subscriptionPlanApi";
import DeleteProgramModal from "./components/DeleteProgramModal";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";

const DEFAULT_ROWS_PER_PAGE = 6;

const getLevelBadgeClass = (level) => {
  const key = String(level ?? "").toLowerCase();
  if (key.includes("beginner")) return "border-sky-200 bg-sky-50 text-sky-800";
  if (key.includes("intermediate")) return "border-amber-200 bg-amber-50 text-amber-800";
  if (key.includes("advanced")) return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-primary/15 bg-primary/8 text-primary";
};

export default function FitnessProgramsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [programs, setPrograms] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [serverTotal, setServerTotal] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 350);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const load = async () => {
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

      setIsFetching(true);
      try {
        /** Pagination must match backend: send only `page`, `limit`, and optional `search`. */
        const params = {
          page: currentPage,
          limit: rowsPerPage,
        };
        const q = debouncedSearchTerm.trim();
        if (q) {
          params.q = q;
          params.search = q;
        }

        const res = await axios.get(joinAdminPath(baseUrl, "get-all-programs"), {
          headers: {
            token,
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
          params,
        });

        const payload = res?.data ?? {};
        if (isAdminApiErrorPayload(payload)) {
          toast.error(payload.message || "Failed to fetch programs");
          setPrograms([]);
          return;
        }

        const rawList = extractProgramsFromListResponse(res?.data);
        const meta = extractListMeta(res?.data);

        const mapped = rawList
          .filter((raw) => !rawProgramExcludedFromAdminList(raw))
          .map(mapProgramFromApi)
          .filter(Boolean);

        if (meta.total !== undefined) setServerTotal(meta.total);
        else setServerTotal(mapped.length);

        if (meta.totalPages !== undefined) setServerTotalPages(Math.max(1, meta.totalPages));
        else setServerTotalPages(1);

        setPrograms(mapped);
      } catch (err) {
        console.error("Fetch programs failed:", err?.response?.data || err?.message);
        toast.error(err?.response?.data?.message || "Failed to fetch programs");
        setPrograms([]);
      } finally {
        setIsFetching(false);
      }
    };

    load();
  }, [currentPage, rowsPerPage, debouncedSearchTerm, refreshKey]);

  const totalItems = serverTotal || programs.length;
  const totalPages = Math.max(1, serverTotalPages || 1);
  const start = (currentPage - 1) * rowsPerPage;
  const pageRows = programs;

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const confirmDeleteProgram = async () => {
    const p = deleteTarget;
    if (!p) return;

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

    setIsDeleting(true);
    try {
      const res = await deleteProgramById(p.id, { token, baseUrl });
      const data = res?.data ?? {};
      if (isAdminApiErrorPayload(data)) {
        toast.error(data.message || data.msg || "Failed to delete program");
        return;
      }
      try {
        sessionStorage.removeItem(programCacheKey(p.id));
        sessionStorage.removeItem(programEditKey(p.id));
      } catch {
        /* ignore */
      }
      toast.success("Program deleted.");
      const deletedId = String(p.id);
      setPrograms((prev) => prev.filter((row) => String(row.id) !== deletedId));
      setServerTotal((t) => Math.max(0, (t || 0) - 1));
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Delete program failed:", err?.response?.data || err?.message);
      const msg =
        err?.adminPayload?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete program";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const stashProgramForRoute = (p) => {
    try {
      if (p?._raw) {
        sessionStorage.setItem(programCacheKey(p.id), JSON.stringify(p._raw));
      }
    } catch (e) {
      console.warn("sessionStorage program cache failed", e);
    }
  };

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
    if (currentPage >= totalPages - 3)
      return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", currentPage - 1, currentPage, currentPage + 1, "…", totalPages];
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-[80vh] px-1 py-8">
      <AdminHeaderCard
        title="Fitness Programs"
        subtitle="Manage workout programs used in the app."
        actions={
          <Button type="button" onClick={() => router.push("/fitness-programs/new")}>
            + Add Program
          </Button>
        }
      />

      <div className="surface-card mt-6 p-4">
        <Input
          placeholder="Search by title, level, or tagline..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full rounded-xl border-border bg-background"
        />
      </div>

      <div className="surface-card mt-6 max-h-[520px] w-full overflow-auto">
        <Table unwrap className="min-w-[1000px] w-full table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
            <TableRow className="border-b border-border/80 bg-muted/90">
              <TableHead className="px-4 py-3 font-semibold text-primary/85">PROGRAM</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-primary/85">LEVEL</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-primary/85">DURATION</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-primary/85">FREQ. / WK</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-primary/85">AVG. SESSION</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-primary/85">STATUS</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-primary/85">UPDATED</TableHead>
              <TableHead className="min-w-[148px] w-[148px] px-4 py-3 font-semibold text-primary/85">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-card">
            {pageRows.length > 0 ? (
              pageRows.map((p, idx) => (
                <TableRow
                  key={p.id}
                  className={idx % 2 === 1 ? "bg-muted/35" : ""}
                >
                  <TableCell className="max-w-[280px] px-4 py-3">
                    <p
                      className="font-medium text-primary whitespace-normal break-words"
                      title={p.title}
                    >
                      {p.title}
                    </p>
                    {p.subHeader && (
                      <p
                        className="mt-1 text-xs text-muted-foreground whitespace-normal break-words leading-snug"
                        title={p.subHeader}
                      >
                        {p.subHeader}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        getLevelBadgeClass(p.level),
                      ].join(" ")}
                    >
                      {p.level}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    {p.durationWeeks} weeks
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">{p.frequencyPerWeek} days</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">{p.avgSessionMinutes} min</TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : p.status === "Inactive"
                            ? "bg-gray-100 text-gray-700"
                            : p.status === "Deleted" || p.status === "Removed"
                              ? "bg-red-100 text-red-800"
                              : p.status === "Archived"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">{p.updatedAt}</TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          stashProgramForRoute(p);
                          router.push(`/fitness-programs/${p.id}`);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                        aria-label="View program"
                        title="View"
                      >
                        <FaRegEye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stashProgramForRoute(p);
                          router.push(`/fitness-programs/${p.id}/edit`);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/18"
                        aria-label="Edit program"
                        title="Edit"
                      >
                        <FaRegEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        aria-label="Delete program"
                        title="Delete"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  {isFetching
                    ? "Loading programs…"
                    : programs.length === 0
                      ? "No programs yet. Add one with + Add Program."
                      : "No programs on this page."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="surface-card mt-4 flex flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <select
            className="rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[6, 10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {totalItems === 0 ? 0 : start + 1}-{Math.min(start + rowsPerPage, totalItems)} of{" "}
          {totalItems} programs
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`h-10 rounded-lg border px-4 text-sm font-medium transition-colors ${
              currentPage === 1
                ? "cursor-not-allowed border-border bg-muted text-muted-foreground/60"
                : "border-border bg-card text-foreground hover:bg-muted/80"
            }`}
          >
            &lt; Previous
          </button>
          {paginationItems.map((item, idx) => {
            if (item === "…") {
              return (
                <span key={`e-${idx}`} className="select-none px-2 text-muted-foreground">
                  …
                </span>
              );
            }
            const page = item;
            const isActive = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                className={`h-10 w-10 rounded-lg border text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted/80"
                }`}
              >
                {page}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`h-10 rounded-lg border px-4 text-sm font-medium transition-colors ${
              currentPage === totalPages
                ? "cursor-not-allowed border-border bg-muted text-muted-foreground/60"
                : "border-border bg-card text-foreground hover:bg-muted/80"
            }`}
          >
            Next &gt;
          </button>
        </div>
      </div>

      <DeleteProgramModal
        open={!!deleteTarget}
        program={deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteProgram}
      />
    </div>
  );
}
