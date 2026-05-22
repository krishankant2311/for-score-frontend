"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
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
import { FaRegEye } from "react-icons/fa";
import { HiOutlineTrash } from "react-icons/hi";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";
import ViewFeedbackModal from "./components/ViewFeedbackModal";
import DeleteFeedbackModal from "./components/DeleteFeedbackModal";
import { deleteFeedbackById, fetchAllFeedback, updateFeedbackStatusByAdmin } from "@/lib/feedbackApi";

const DEFAULT_ROWS_PER_PAGE = 10;

const FILTER_TYPES = [
  { value: "", label: "All types" },
  { value: "Bug", label: "Bug" },
  { value: "Feature", label: "Feature" },
  { value: "Suggestion", label: "Suggestion" },
  { value: "General", label: "General" },
];

const FILTER_API_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "InProgress", label: "In progress" },
  { value: "Resolved", label: "Resolved" },
];

const ROW_STATUS_VALUES = FILTER_API_STATUSES.filter((x) => x.value);

const MOCK_FEEDBACK = [
  {
    id: "demo-1",
    userName: "Demo User",
    userEmail: "demo.user@example.com",
    type: "Feature",
    message:
      "Great app overall — workouts are easy to follow. Would love a dark mode toggle and a way to bookmark recovery videos.",
    status: "New",
    statusKey: "new",
    backendStatus: "new",
    createdAt: "2026-04-10",
  },
  {
    id: "demo-2",
    userName: "Ava K.",
    userEmail: "ava.k@example.com",
    type: "Bug",
    message:
      "The macro calculator is helpful, but the onboarding steps felt long. Can we skip some steps and edit later?",
    status: "Resolved",
    statusKey: "resolved",
    backendStatus: "Resolved",
    createdAt: "2026-04-09",
  },
  {
    id: "demo-3",
    userName: "Rohit",
    userEmail: "rohit@example.com",
    type: "Suggestion",
    message:
      "Please add more beginner-friendly mobility sessions and a weekly progress summary notification.",
    status: "In Progress",
    statusKey: "inprogress",
    backendStatus: "InProgress",
    createdAt: "2026-04-08",
  },
];

export default function FeedbackPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterApiStatus, setFilterApiStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [items, setItems] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingIds, setUpdatingIds] = useState(() => new Set());
  const [hasShownDemoToast, setHasShownDemoToast] = useState(false);
  const updateLockRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
      if (!baseUrl) {
        if (!hasShownDemoToast) {
          toast.error("Feedback service is not configured yet. Showing sample feedback for preview.", {
            id: "feedback-missing-base-url",
          });
          setHasShownDemoToast(true);
        }
        setItems(MOCK_FEEDBACK);
        setIsFetching(false);
        return;
      }
      if (!token) {
        if (!hasShownDemoToast) {
          toast.error("Could not verify your session. Showing sample feedback for preview.", {
            id: "feedback-missing-token",
          });
          setHasShownDemoToast(true);
        }
        setItems(MOCK_FEEDBACK);
        setIsFetching(false);
        return;
      }
      setIsFetching(true);
      try {
        const list = await fetchAllFeedback({
          token,
          baseUrl,
          type: filterType || undefined,
          status: filterApiStatus || undefined,
        });
        setItems(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Load feedback failed:", err?.adminPayload || err?.message);
        toast.error(err?.adminPayload?.message || err?.message || "Could not load feedback.", {
          id: "feedback-load-failed",
        });
        setItems([]);
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, [refreshKey, filterType, filterApiStatus, hasShownDemoToast]);

  const openCount = items.filter((i) => i.statusKey !== "resolved").length;
  const resolvedCount = items.filter((i) => i.statusKey === "resolved").length;

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return items.filter((i) => {
      return (
        (i.userName || "").toLowerCase().includes(q) ||
        (i.userEmail || "").toLowerCase().includes(q) ||
        (i.message || "").toLowerCase().includes(q) ||
        (i.type || "").toLowerCase().includes(q)
      );
    });
  }, [items, searchTerm]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = filtered.slice(start, start + rowsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!baseUrl) {
      toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).", { id: "feedback-missing-base-url" });
      return;
    }
    if (!token) {
      toast.error("Session expired. Please login again.", { id: "feedback-missing-token" });
      return;
    }
    setIsDeleting(true);
    try {
      await deleteFeedbackById(deleteTarget.id, { token, baseUrl });
      toast.success("Feedback deleted.", { id: `feedback-deleted:${deleteTarget.id}` });
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Delete feedback failed:", err?.adminPayload || err?.message);
      toast.error(err?.adminPayload?.message || err?.message || "Failed to delete feedback", {
        id: `feedback-delete-failed:${deleteTarget?.id || "unknown"}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const applyStatusChange = async (row, nextStatus) => {
    if (updateLockRef.current) return;
    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!baseUrl) {
      toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).", { id: "feedback-missing-base-url" });
      return;
    }
    if (!token) {
      toast.error("Session expired. Please login again.", { id: "feedback-missing-token" });
      return;
    }
    const trimmed = String(nextStatus ?? "").trim();
    const same =
      trimmed.toLowerCase() === String(row.backendStatus ?? "").trim().toLowerCase() ||
      (trimmed === "InProgress" && String(row.backendStatus) === "InProgress");
    if (!trimmed || same) return;

    updateLockRef.current = true;
    setUpdatingIds((s) => new Set(s).add(row.id));
    try {
      await updateFeedbackStatusByAdmin(row.id, trimmed, { token, baseUrl });
      toast.success("Status updated.", { id: `feedback-status-updated:${row.id}` });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Update feedback failed:", err?.adminPayload || err?.message);
      toast.error(err?.adminPayload?.message || err?.message || "Failed to update feedback", {
        id: `feedback-update-failed:${row.id}`,
      });
    } finally {
      updateLockRef.current = false;
      setUpdatingIds((s) => {
        const next = new Set(s);
        next.delete(row.id);
        return next;
      });
    }
  };

  const statusBadgeClass = (item) => {
    const raw = String(item.backendStatus ?? item.status ?? "").toLowerCase();
    if (raw.includes("deleted") || raw.includes("removed")) return "bg-red-100 text-red-900";
    if (item.statusKey === "resolved") return "bg-emerald-100 text-emerald-800";
    if (item.statusKey === "inprogress") return "bg-sky-100 text-sky-900";
    return "bg-amber-100 text-amber-900";
  };

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
    if (currentPage >= totalPages - 3)
      return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", currentPage - 1, currentPage, currentPage + 1, "…", totalPages];
  }, [currentPage, totalPages]);

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  const typeBadgeTone = (t) => {
    const key = String(t ?? "").toLowerCase();
    if (key.includes("bug")) return "border-rose-200 bg-rose-50 text-rose-900";
    if (key.includes("feature")) return "border-sky-200 bg-sky-50 text-sky-900";
    if (key.includes("suggestion")) return "border-violet-200 bg-violet-50 text-violet-900";
    if (key.includes("general")) return "border-[#C8D7E9] bg-[#F2F5FA] text-[#0A3161]";
    return "border-primary/15 bg-primary/8 text-primary";
  };

  const selectRowStatusValue = (item) => {
    const backend = String(item.backendStatus ?? "").trim();
    const known = ROW_STATUS_VALUES.find(
      (o) => o.value.toLowerCase() === backend.toLowerCase() || o.value === backend
    );
    if (known) return known.value;
    if (!backend) return "new";
    return backend;
  };

  const extraBackendStatusOption = (item) => {
    const b = String(item.backendStatus ?? "").trim();
    if (!b) return null;
    if (ROW_STATUS_VALUES.some((o) => o.value === b || o.value.toLowerCase() === b.toLowerCase())) return null;
    return b;
  };

  /** @param {{ userName?: string; userEmail?: string }} row */
  const displayFeedbackUser = (row) => {
    const n = String(row.userName ?? "").trim();
    if (n && n !== "—") return n;
    const em = String(row.userEmail ?? "").trim();
    if (em.includes("@")) return em.split("@")[0] || "User";
    return "—";
  };

  /** @param {{ status?: string; backendStatus?: string }} row */
  const feedbackStatusLabel = (row) => {
    const s = String(row.status ?? "").trim();
    const b = String(row.backendStatus ?? "").trim();
    return s || b || "—";
  };

  return (
    <div className="min-h-[80vh] px-1 py-8">
      <AdminHeaderCard
        title="Feedback"
        subtitle="View and manage feedback submitted from the app — filters call the admin API."
        stats={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>
              Total{" "}
              <span className="font-semibold text-foreground">{items.length}</span>
            </span>
            <span className="text-muted-foreground/50" aria-hidden>
              |
            </span>
            <span className="text-amber-800 dark:text-amber-300">
              Open-ish <span className="font-semibold">{openCount}</span>
            </span>
            <span className="text-muted-foreground/50" aria-hidden>
              |
            </span>
            <span className="text-emerald-800 dark:text-emerald-300">
              Resolved <span className="font-semibold">{resolvedCount}</span>
            </span>
          </div>
        }
        actions={
          <Button type="button" onClick={() => setRefreshKey((k) => k + 1)}>
            Refresh
          </Button>
        }
      />

      <div className="surface-card mt-6 space-y-4 p-4 md:p-5">
        <Input
          placeholder="Search by name, email, type, or message…"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full rounded-xl border-border bg-background"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-semibold text-primary">Type filter</label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
            >
              {FILTER_TYPES.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-semibold text-primary">Status filter</label>
            <select
              value={filterApiStatus}
              onChange={(e) => {
                setFilterApiStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
            >
              {FILTER_API_STATUSES.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* <p className="text-xs leading-relaxed text-muted-foreground">
          API:{" "}
          <code className="rounded-md bg-muted px-1.5 py-px font-mono text-[11px]">get-all-feedback-byadmin</code>
          {' · '}optional query <code className="font-mono text-[11px]">type</code>,{" "}
          <code className="font-mono text-[11px]">status</code> (e.g. <code className="font-mono text-[11px]">Bug</code> +{" "}
          <code className="font-mono text-[11px]">new</code>).
        </p> */}
      </div>

      <div className="mt-6 w-full max-h-[500px] overflow-x-auto overflow-y-auto rounded-lg border border-[#C8D7E9] bg-white shadow-md">
        <Table className="min-w-[1280px]">
          <TableHeader className="sticky top-0 z-10 bg-[#F2F5FA]">
            <TableRow className="border-b bg-[#F2F5FA]">
              <TableHead className="min-w-[100px] px-4 py-3 font-semibold text-[#2158A3]">USER</TableHead>
              <TableHead className="min-w-[200px] px-4 py-3 font-semibold text-[#2158A3]">EMAIL</TableHead>
              <TableHead className="min-w-[96px] px-4 py-3 font-semibold text-[#2158A3]">TYPE</TableHead>
              <TableHead className="min-w-[220px] px-4 py-3 font-semibold text-[#2158A3]">MESSAGE</TableHead>
              <TableHead className="min-w-[140px] px-4 py-3 font-semibold text-[#2158A3]">STATUS</TableHead>
              <TableHead className="min-w-[9.5rem] whitespace-nowrap px-4 py-3 font-semibold text-[#2158A3]">
                CREATED
              </TableHead>
              <TableHead className="min-w-[260px] whitespace-nowrap px-4 py-3 text-right font-semibold text-[#2158A3]">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Loading feedback…
                </TableCell>
              </TableRow>
            ) : paginated.length > 0 ? (
              paginated.map((row, idx) => {
                const extraStatusOpt = extraBackendStatusOption(row);
                const statusLabel = feedbackStatusLabel(row);
                return (
                  <TableRow key={row.id} className={idx % 2 === 1 ? "bg-gray-50/50" : ""}>
                    <TableCell className="px-4 py-3 align-middle">
                      <p
                        className="truncate font-medium text-[#0A3161]"
                        title={displayFeedbackUser(row) !== "—" ? displayFeedbackUser(row) : row.userEmail || ""}
                      >
                        {displayFeedbackUser(row)}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 align-middle">
                      <p className="truncate text-sm font-normal text-[#2158A3]" title={row.userEmail || ""}>
                        {row.userEmail || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 align-middle">
                      {String(row.type ?? "").trim() ? (
                        <span
                          className={[
                            "inline-flex max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            typeBadgeTone(row.type),
                          ].join(" ")}
                          title={row.type}
                        >
                          {row.type}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal px-4 py-3 align-top">
                      <p
                        className="line-clamp-2 break-words text-sm leading-snug text-[#0A3161]"
                        title={row.message}
                      >
                        {row.message || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 align-middle">
                      <span
                        title={statusLabel}
                        className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(row)}`}
                      >
                        {statusLabel}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[9.5rem] whitespace-nowrap px-4 py-3 align-middle text-sm font-normal text-[#2158A3]">
                      {row.createdAt}
                    </TableCell>
                    <TableCell className="min-w-[260px] px-4 py-3 align-middle">
                      <div className="flex flex-nowrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewTarget(row)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700 transition-colors hover:bg-gray-300"
                          aria-label="View feedback"
                          title="View"
                        >
                          <FaRegEye className="h-4 w-4" />
                        </button>
                        <select
                          value={selectRowStatusValue(row)}
                          disabled={updatingIds.has(row.id)}
                          aria-label="Change status"
                          title="Change status"
                          onChange={(e) => {
                            const v = e.target.value;
                            applyStatusChange(row, v);
                          }}
                          className="h-8 w-[7.5rem] shrink-0 rounded-md border border-[#C8D7E9] bg-white px-1.5 text-xs font-medium text-[#0A3161] outline-none focus:ring-2 focus:ring-[#2158A3]/30 sm:w-[8.25rem]"
                        >
                          {ROW_STATUS_VALUES.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                          {extraStatusOpt ? <option value={extraStatusOpt}>{extraStatusOpt}</option> : null}
                        </select>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                          aria-label="Delete feedback"
                          title="Delete"
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {items.length === 0 ? "No feedback yet." : "No feedback matches your search on this page."}
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
          Showing {totalItems === 0 ? 0 : start + 1}-{Math.min(start + rowsPerPage, totalItems)} of {totalItems}{" "}
          items
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
          {paginationItems.map((item, idx) =>
            item === "…" ? (
              <span key={`ellipsis-${idx}`} className="select-none px-2 text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => goToPage(item)}
                className={`h-10 w-10 rounded-lg border text-sm font-medium transition-colors ${
                  item === currentPage
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted/80"
                }`}
              >
                {item}
              </button>
            )
          )}
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

      <DeleteFeedbackModal
        open={!!deleteTarget}
        feedback={deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => (isDeleting ? null : setDeleteTarget(null))}
        onConfirm={confirmDelete}
      />

      <ViewFeedbackModal open={!!viewTarget} feedback={viewTarget} onClose={() => setViewTarget(null)} />
    </div>
  );
}

