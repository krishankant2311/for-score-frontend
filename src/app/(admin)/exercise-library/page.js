"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
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
import { FaRegEye, FaRegEdit } from "react-icons/fa";
import { HiOutlineTrash } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";

import DeleteExerciseModal from "./components/DeleteExerciseModal";
import ViewExerciseModal from "./components/ViewExerciseModal";

// const DEFAULT_ROWS_PER_PAGE = 6;

const CATEGORY_BADGE_STYLES = {
  legs: "bg-emerald-100 text-emerald-900 border-emerald-200",
  chest: "bg-rose-100 text-rose-900 border-rose-200",
  back: "bg-indigo-100 text-indigo-900 border-indigo-200",
  shoulders: "bg-amber-100 text-amber-900 border-amber-200",
  arms: "bg-cyan-100 text-cyan-900 border-cyan-200",
  glutes: "bg-purple-100 text-purple-900 border-purple-200",
  core: "bg-lime-100 text-lime-900 border-lime-200",
  cardio: "bg-orange-100 text-orange-900 border-orange-200",
};

function getCategoryBadgeClass(category) {
  const key = (category || "").toString().trim().toLowerCase();
  return CATEGORY_BADGE_STYLES[key] ?? "bg-gray-100 text-gray-900 border-gray-200";
}

const MEDIA_TYPE_BADGE_STYLES = {
  video: "bg-sky-100 text-sky-900 border-sky-200",
  image: "bg-violet-100 text-violet-900 border-violet-200",
  gif: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200",
};

function getMediaTypeBadgeClass(mediaType) {
  const key = (mediaType || "").toString().trim().toLowerCase();
  return MEDIA_TYPE_BADGE_STYLES[key] ?? "bg-gray-100 text-gray-900 border-gray-200";
}

export default function ExerciseLibrary() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all"); // 'all' | 'beginner' | 'intermediate' | 'advanced'
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [exercises, setExercises] = useState([]);
  const [isFetchingExercises, setIsFetchingExercises] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [totalExercises, setTotalExercises] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);

  const handleView = (id) => {
    const exercise = exercises.find((e) => e.id === id);
    setViewTarget(exercise || null);
  };

  const handleEdit = (id) => {
    const exercise = exercises.find((e) => e.id === id);
    if (exercise) {
      sessionStorage.setItem(`exercise-edit:${id}`, JSON.stringify(exercise));
    }
    router.push(`/exercise-library/${id}/edit`);
  };

  const handleDelete = (id) => {
    // Prevent repeated taps from trying to reopen the same modal.
    if (deleteTarget) return;
    const exercise = exercises.find((e) => e.id === id);
    setDeleteTarget(exercise || null);
  };

  const activeCount = exercises.filter((e) => e.status === "Active").length;
  const inactiveCount = exercises.filter((e) => e.status === "Inactive").length;
  const beginnerCount = exercises.filter((e) => e.difficulty === "Beginner").length;
  const intermediateCount = exercises.filter((e) => e.difficulty === "Intermediate").length;
  const advancedCount = exercises.filter((e) => e.difficulty === "Advanced").length;

  const start = (currentPage - 1) * rowsPerPage;
  const totalPages = Math.max(1, serverTotalPages || 1);
  const paginatedExercises = exercises; // already server-paginated

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
    if (currentPage >= totalPages - 3)
      return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", currentPage - 1, currentPage, currentPage + 1, "…", totalPages];
  }, [currentPage, totalPages]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 350);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const fetchExercises = async () => {
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

      setIsFetchingExercises(true);
      try {
        const params = {
          page: currentPage,
          limit: rowsPerPage,
        };

        const trimmedSearch = debouncedSearchTerm.trim();
        if (trimmedSearch) params.search = trimmedSearch;

        if (difficultyFilter !== "all") {
          const difficultyMap = {
            beginner: "Beginner",
            intermediate: "Intermediate",
            advanced: "Advanced",
          };
          params.difficultyLevel = difficultyMap[difficultyFilter] ?? difficultyFilter;
        }

        const res = await axios.get(`${baseUrl}/api/admin/get-all-exercises`, {
          headers: { token },
          params,
        });
        console.log(res?.data);

        const result = res?.data?.result ?? {};
        const raw = result.exercises ?? [];
        setTotalExercises(result.total ?? 0);
        setServerTotalPages(result.totalPages ?? 1);

        const mapped = raw.map((ex) => {
          const createdAt = ex?.createdAt
            ? new Date(ex.createdAt).toISOString().slice(0, 10)
            : "";

          return {
            id: ex?._id ?? ex?.id,
            title: ex?.title ?? "",
            category: ex?.category ?? "",
            difficulty: ex?.difficultyLevel ?? ex?.difficulty ?? "",
            mediaType: ex?.mediaType ?? "",
            status: ex?.status ?? "Active",
            createdAt,
          };
        });

        setExercises(mapped);
      } catch (err) {
        console.error("Fetch exercises failed:", err?.response?.data || err?.message);
        toast.error(err?.response?.data?.message || "Failed to fetch exercises");
      } finally {
        setIsFetchingExercises(false);
      }
    };

    fetchExercises();
  }, [currentPage, rowsPerPage, difficultyFilter, debouncedSearchTerm, refreshKey]);

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <AdminHeaderCard
        title="Exercise Library"
        subtitle="Manage exercises shown in the app library."
        stats={
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{totalExercises}</span>
            <span className="mx-2 text-muted-foreground/60">|</span>
            Active:{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{activeCount}</span>
            <span className="mx-2 text-muted-foreground/60">|</span>
            Inactive:{" "}
            <span className="font-semibold text-rose-700 dark:text-rose-300">{inactiveCount}</span>
          </p>
        }
        actions={<Button onClick={() => router.push("/exercise-library/new")}>+ Add new Exercise</Button>}
      />


      <div className="p-4 mt-6 bg-white rounded-lg border border-[#C8D7E9] shadow-md">
        <Input
          placeholder="Search exercises by title, category, difficulty level, or media type..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full border-[#C8D7E9] rounded-md"
        />

        <div className="mt-4 flex gap-2">
          {[
            { key: "all", label: `All (${totalExercises})` },
            { key: "beginner", label: `Beginner (${beginnerCount})` },
            { key: "intermediate", label: `Intermediate (${intermediateCount})` },
            { key: "advanced", label: `Advanced (${advancedCount})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setDifficultyFilter(key);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${difficultyFilter === key
                ? "bg-[#1e3a5f] text-white"
                : "bg-white text-[#1e3a5f] border border-gray-300 hover:bg-gray-50"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 w-full overflow-x-auto border border-[#C8D7E9] rounded-lg shadow-md max-h-[500px] overflow-y-auto">
        <Table className="min-w-[1200px]">
          <TableHeader className="sticky top-0 z-10 bg-[#F2F5FA]">
            <TableRow className="border-b bg-[#F2F5FA]">
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">TITLE</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">CATEGORY</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">
                DIFFICULTY LEVEL
              </TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">MEDIA TYPE</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">STATUS</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">
                CREATED AT
              </TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {isFetchingExercises ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  Loading exercises...
                </TableCell>
              </TableRow>
            ) : paginatedExercises.length > 0 ? (
              paginatedExercises.map((ex, idx) => (
                <TableRow key={ex.id} className={idx % 2 === 1 ? "bg-gray-50/50" : ""}>
                  <TableCell className="px-4 py-3 font-medium text-[#0A3161] max-w-[360px]">
                    <p
                      className="break-words whitespace-pre-wrap line-clamp-3"
                      title={ex.title}
                    >
                      {ex.title}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-3 max-w-[260px]">
                    <span
                      className={[
                        "inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-medium border",
                        getCategoryBadgeClass(ex.category),
                      ].join(" ")}
                      title={ex.category}
                    >
                      <span className="break-words whitespace-pre-wrap line-clamp-3">
                        {ex.category}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        ex.difficulty === "Beginner"
                          ? "bg-blue-100 text-blue-800"
                          : ex.difficulty === "Intermediate"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {ex.difficulty}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border",
                        getMediaTypeBadgeClass(ex.mediaType),
                      ].join(" ")}
                    >
                      {ex.mediaType}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ex.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                        }`}
                    >
                      {ex.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-[#2158A3] font-normal text-sm">
                    {ex.createdAt}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleView(ex.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                        aria-label="View exercise"
                      >
                        <FaRegEye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(ex.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/18"
                        aria-label="Edit exercise"
                      >
                        <FaRegEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ex.id)}
                        disabled={!!deleteTarget}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                          deleteTarget
                            ? "bg-red-50/60 text-red-400 cursor-not-allowed"
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}
                        aria-label="Delete exercise"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No exercises found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg border border-[#C8D7E9] shadow-md px-4 py-4 ">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows per page:</span>
            <select
              className="border border-[#C8D7E9] rounded-md px-2 py-1 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[ 10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600">
            Showing {totalExercises === 0 ? 0 : start + 1}-
            {Math.min(start + rowsPerPage, totalExercises)} of {totalExercises} exercises
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`h-10 px-4 rounded-lg border text-sm font-medium transition-colors ${currentPage === 1
              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
              }`}
          >
            &lt; Previous
          </button>

          {paginationItems.map((item, idx) => {
            if (item === "…") {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-500 select-none">
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
                aria-current={isActive ? "page" : undefined}
                className={`h-10 w-10 rounded-lg border text-sm font-medium transition-colors ${isActive
                  ? "bg-[#0A3161] text-white border-[#0A3161]"
                  : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
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
            className={`h-10 px-4 rounded-lg border text-sm font-medium transition-colors ${currentPage === totalPages
              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
              }`}
          >
            Next &gt;
          </button>
        </div>
      </div>

      <DeleteExerciseModal
        open={!!deleteTarget}
        exercise={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const exerciseTitle = deleteTarget.title;
          const exerciseId = deleteTarget.id;
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

          try {
            await axios.post(
              `${baseUrl}/api/admin/delete-exercises/${exerciseId}`,
              {},
              { headers: { token } }
            );
            setDeleteTarget(null);
            toast.success(`Exercise ${exerciseTitle} deleted successfully!`);
            setRefreshKey((k) => k + 1);
          } catch (err) {
            console.error("Delete exercise failed:", err?.response?.data || err?.message);
            toast.error(err?.response?.data?.message || "Failed to delete exercise");
          }
        }}
      />

      <ViewExerciseModal
        open={!!viewTarget}
        exercise={viewTarget}
        onClose={() => setViewTarget(null)}
      />
    </div>
  );
}
