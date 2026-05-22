"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import axios from "axios";

import DeleteRecoveryModal from "./components/DeleteRecoveryModal";
import ViewRecoveryModal from "./components/ViewRecoveryModal";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";

const DEFAULT_ROWS_PER_PAGE = 6;

function mapApiRecoveryToRow(r) {
  const createdAt = r?.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "";
  return {
    id: r?._id ?? r?.id,
    title: r?.title ?? "",
    category: r?.category ?? "",
    contentType: r?.contentType ?? "",
    status: r?.status ?? "Active",
    description: r?.description ?? "",
    durationOrTarget: r?.durationOrTarget ?? "",
    mediaPath: r?.mediaPath ?? "",
    createdAt,
  };
}

export default function RecoveryContent() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [recoveryItems, setRecoveryItems] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [serverTotal, setServerTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const categoryBadgeClass = (category) => {
    switch (String(category || "").toLowerCase()) {
      case "breathing":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "stretching":
        return "bg-emerald-100 text-emerald-900 border-emerald-200";
      case "sleep":
        return "bg-indigo-100 text-indigo-900 border-indigo-200";
      case "meditation":
        return "bg-violet-100 text-violet-900 border-violet-200";
      case "self-massage":
      case "self massage":
        return "bg-amber-100 text-amber-900 border-amber-200";
      case "nutrition":
        return "bg-orange-100 text-orange-900 border-orange-200";
      case "yoga":
        return "bg-teal-100 text-teal-900 border-teal-200";
      case "therapy":
        return "bg-rose-100 text-rose-900 border-rose-200";
      case "relaxation":
        return "bg-slate-200 text-slate-800 border-slate-300";
      case "Hydration":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleView = (id) => {
    const item = recoveryItems.find((r) => r.id === id);
    setViewTarget(item || null);
  };

  const handleEdit = (id) => {
    const item = recoveryItems.find((r) => r.id === id);
    try {
      if (item) sessionStorage.setItem("recovery_edit_item", JSON.stringify(item));
    } catch {
      // ignore
    }
    router.push(`/recovery-content/${id}/edit`);
  };

  const handleDelete = (id) => {
    // Prevent repeated taps from trying to reopen the same modal.
    if (deleteTarget) return;
    const item = recoveryItems.find((r) => r.id === id);
    setDeleteTarget(item || null);
  };

  const filteredItems = useMemo(() => {
    let list = recoveryItems.filter((r) => {
      const q = searchTerm.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.contentType.toLowerCase().includes(q)
      );
    });

    if (categoryFilter !== "all") {
      list = list.filter((r) => r.category === categoryFilter);
    }
    return list;
  }, [searchTerm, categoryFilter, recoveryItems]);

  const totalItems = filteredItems.length;
  const activeCount = recoveryItems.filter((r) => r.status === "Active").length;
  const inactiveCount = recoveryItems.filter((r) => r.status === "Inactive").length;

  // Get unique categories for filter buttons
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(recoveryItems.map((r) => r.category))];
    return uniqueCategories;
  }, [recoveryItems]);

  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const paginatedItems = filteredItems.slice(start, start + rowsPerPage);

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
    const fetchRecovery = async () => {
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
        // Backend supports pagination, but this page's UI does client-side search + filters.
        // So we fetch a big chunk and paginate locally.
        const params = { page: 1, limit: 1000 };
        const res = await axios.get(`${baseUrl}/api/admin/get-all-recovery-content`, {
          headers: { token },
          params,
        });

        const list = res?.data?.result?.contentList ?? [];
        const mapped = Array.isArray(list) ? list.map(mapApiRecoveryToRow) : [];

        setRecoveryItems(mapped);
        setServerTotal(mapped.length);
      } catch (err) {
        console.error("Fetch recovery content failed:", err?.response?.data || err?.message);
        toast.error(err?.response?.data?.message || "Failed to fetch recovery content");
      } finally {
        setIsFetching(false);
      }
    };

    fetchRecovery();
  }, [refreshKey]);

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <AdminHeaderCard
        title="Recovery Content"
        subtitle="Manage recovery routines and content shown in the app."
        stats={
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{serverTotal}</span>
            <span className="mx-2 text-muted-foreground/60">|</span>
            Active:{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{activeCount}</span>
            <span className="mx-2 text-muted-foreground/60">|</span>
            Inactive:{" "}
            <span className="font-semibold text-rose-700 dark:text-rose-300">{inactiveCount}</span>
          </p>
        }
        actions={
          <Button onClick={() => router.push("/recovery-content/new")}>
            + Add new Recovery Content
          </Button>
        }
      />

      <div className="p-4 mt-6 bg-white rounded-lg border border-[#C8D7E9] shadow-md">
        <Input
          placeholder="Search by title, category, or content type..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full border-[#C8D7E9] rounded-md"
        />

        <div className="mt-4 flex gap-2 flex-wrap">
          {[
            { key: "all", label: `All (${serverTotal})` },
            ...categories.map((cat) => ({
              key: cat,
              label: `${cat} (${recoveryItems.filter((r) => r.category === cat).length})`,
            })),
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setCategoryFilter(key);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                categoryFilter === key
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
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">CONTENT TYPE</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">STATUS</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">CREATED AT</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  Loading recovery content...
                </TableCell>
              </TableRow>
            ) : paginatedItems.length > 0 ? (
              paginatedItems.map((item, idx) => (
                <TableRow key={item.id} className={idx % 2 === 1 ? "bg-gray-50/50" : ""}>
                  <TableCell className="px-4 py-3 font-medium text-[#0A3161] whitespace-normal break-words max-w-[420px]">
                    <p className="whitespace-normal break-words" title={item.title}>
                      {item.title}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${categoryBadgeClass(
                        item.category
                      )}`}
                    >
                      {item.category}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        item.contentType === "Video"
                          ? "bg-blue-100 text-blue-800"
                          : item.contentType === "Article"
                            ? "bg-green-100 text-green-800"
                            : item.contentType === "Audio"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.contentType}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-[#2158A3] font-normal text-sm">
                    {item.createdAt}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleView(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                        aria-label="View recovery content"
                      >
                        <FaRegEye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/18"
                        aria-label="Edit recovery content"
                      >
                        <FaRegEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={!!deleteTarget || isDeleting}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                          deleteTarget || isDeleting
                            ? "bg-red-50/60 text-red-400 cursor-not-allowed"
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}
                        aria-label="Delete recovery content"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  No recovery content found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg border border-[#C8D7E9] shadow-md px-4 py-4">
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
              {[6, 10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600">
            Showing {totalItems === 0 ? 0 : start + 1}-{Math.min(start + rowsPerPage, totalItems)}{" "}
            of {totalItems} items
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`h-10 px-4 rounded-lg border text-sm font-medium transition-colors ${
              currentPage === 1
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
                className={`h-10 w-10 rounded-lg border text-sm font-medium transition-colors ${
                  isActive
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
            className={`h-10 px-4 rounded-lg border text-sm font-medium transition-colors ${
              currentPage === totalPages
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Next &gt;
          </button>
        </div>
      </div>

      <DeleteRecoveryModal
        open={!!deleteTarget}
        recoveryItem={deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          if (isDeleting) return;
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
            setIsDeleting(true);
            const res = await axios.delete(
              `${baseUrl}/api/admin/delete-recovery-content/${deleteTarget.id}`,
              { headers: { token } }
            );

            if (res?.data?.success) {
              toast.success(res?.data?.message || "Recovery content deleted successfully!");
              setDeleteTarget(null);
              setRecoveryItems((prev) => prev.filter((r) => r.id !== deleteTarget.id));
              setServerTotal((prev) => Math.max(0, Number(prev || 0) - 1));
              setRefreshKey((k) => k + 1);
            } else {
              toast.error(res?.data?.message || "Failed to delete recovery content");
            }
          } catch (err) {
            console.error("Delete recovery content failed:", err?.response?.data || err?.message);
            toast.error(err?.response?.data?.message || "Failed to delete recovery content");
          } finally {
            setIsDeleting(false);
          }
        }}
      />

      <ViewRecoveryModal
        open={!!viewTarget}
        recoveryItem={viewTarget}
        onClose={() => setViewTarget(null)}
      />
    </div>
  );
}
