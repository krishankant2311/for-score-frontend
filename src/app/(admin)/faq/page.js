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
import { Button } from "@/components/ui/button";
import { FaRegEye, FaRegEdit } from "react-icons/fa";
import { HiOutlineTrash } from "react-icons/hi";
import DeleteFaqModal from "./components/DeleteFaqModal";
import ViewFaqModal from "./components/ViewFaqModal";
import { fetchAllFaqs, deleteFaqById } from "@/lib/faqApi";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";

const DEFAULT_ROWS_PER_PAGE = 6;
const faqSelectClass =
  "h-11 w-full appearance-none rounded-xl border border-[#C8D7E9] bg-white pl-3 pr-9 text-sm font-medium text-[#0A3161] shadow-sm outline-none transition focus:border-[#0A3161]/45 focus:ring-2 focus:ring-[#0A3161]/20";

function stripHtmlToText(input) {
  if (input == null) return "";
  return String(input)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CATEGORY_BADGE_STYLES = {
  general: "bg-slate-100 text-slate-900 border-slate-200",
  account: "bg-indigo-100 text-indigo-900 border-indigo-200",
  subscription: "bg-emerald-100 text-emerald-900 border-emerald-200",
  workout: "bg-orange-100 text-orange-900 border-orange-200",
  nutrition: "bg-lime-100 text-lime-900 border-lime-200",
  recovery: "bg-purple-100 text-purple-900 border-purple-200",
};

function getCategoryBadgeClass(category) {
  const key = (category || "").toString().trim().toLowerCase();
  return CATEGORY_BADGE_STYLES[key] ?? "bg-gray-100 text-gray-900 border-gray-200";
}

export default function FaqPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [categoryFilter, setCategoryFilter] = useState("all"); // all | <category>
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [faqs, setFaqs] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeletingFaq, setIsDeletingFaq] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
      if (!baseUrl) {
        toast.error("API base URL is missing (NEXT_PUBLIC_API_BASE_URL).");
        setIsFetching(false);
        return;
      }
      if (!token) {
        toast.error("Session expired. Please login again.");
        setIsFetching(false);
        return;
      }
      setIsFetching(true);
      try {
        const list = await fetchAllFaqs({ token, baseUrl });
        setFaqs(list);
      } catch (err) {
        console.error("Load FAQs failed:", err?.adminPayload || err?.message);
        toast.error(err?.adminPayload?.message || err?.message || "Failed to load FAQs");
        setFaqs([]);
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, [refreshKey]);

  const filteredFaqs = useMemo(() => {
    const q = searchTerm.toLowerCase();
    let list = faqs.filter((f) => {
      return (
        f.question.toLowerCase().includes(q) ||
        (f.category || "").toLowerCase().includes(q)
      );
    });
    if (statusFilter === "active") list = list.filter((f) => f.status === "Active");
    if (statusFilter === "inactive") list = list.filter((f) => f.status === "Inactive");
    if (categoryFilter !== "all")
      list = list.filter((f) => (f.category || "").toLowerCase() === categoryFilter);
    return list;
  }, [faqs, searchTerm, statusFilter, categoryFilter]);

  const totalFaqs = filteredFaqs.length;
  const activeCount = faqs.filter((f) => f.status === "Active").length;
  const inactiveCount = faqs.filter((f) => f.status === "Inactive").length;

  const categoryOptions = useMemo(() => {
    const set = new Set();
    for (const f of faqs) {
      const c = (f.category || "").toString().trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [faqs]);

  const totalPages = Math.max(1, Math.ceil(totalFaqs / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const paginatedFaqs = filteredFaqs.slice(start, start + rowsPerPage);

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

  const confirmDeleteFaq = async () => {
    if (!deleteTarget) return;
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
    const q = deleteTarget.question;
    setIsDeletingFaq(true);
    try {
      await deleteFaqById(deleteTarget.id, { token, baseUrl });
      toast.success(`FAQ "${q}" deleted.`);
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Delete FAQ failed:", err?.adminPayload || err?.message);
      toast.error(err?.adminPayload?.message || err?.message || "Failed to delete FAQ");
    } finally {
      setIsDeletingFaq(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <AdminHeaderCard
        title="FAQ"
        subtitle="Manage frequently asked questions shown in the app."
        stats={
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{faqs.length}</span>
            <span className="mx-2 text-muted-foreground/60">|</span>
            Active:{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{activeCount}</span>
            <span className="mx-2 text-muted-foreground/60">|</span>
            Inactive:{" "}
            <span className="font-semibold text-rose-700 dark:text-rose-300">{inactiveCount}</span>
          </p>
        }
        actions={<Button onClick={() => router.push("/faq/new")}>+ Add new FAQ</Button>}
      />

      <div className="p-4 mt-6 bg-white rounded-lg border border-[#C8D7E9] shadow-md">
        <Input
          placeholder="Search by question or category..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full border-[#C8D7E9] rounded-md"
        />

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {[
            { key: "all", label: `All (${faqs.length})` },
            { key: "active", label: `Active (${activeCount})` },
            { key: "inactive", label: `Inactive (${inactiveCount})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setStatusFilter(key);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === key
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-white text-[#1e3a5f] border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}

          <div className="flex items-center gap-2 md:ml-auto">
            <span className="text-sm font-medium text-[#0A3161]">Category:</span>
            <div className="relative min-w-[160px]">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={faqSelectClass}
              >
                <option value="all">All</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c.toLowerCase()}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#2158A3]">
                ▾
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 w-full overflow-x-auto border border-[#C8D7E9] rounded-lg shadow-md max-h-[500px] overflow-y-auto">
        <Table className="min-w-[1200px]">
          <TableHeader className="sticky top-0 z-10 bg-[#F2F5FA]">
            <TableRow className="border-b bg-[#F2F5FA]">
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">QUESTION</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">ANSWER</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">CATEGORY</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">STATUS</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">CREATED AT</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-[#5671A6] py-10">
                  Loading FAQs…
                </TableCell>
              </TableRow>
            ) : paginatedFaqs.length > 0 ? (
              paginatedFaqs.map((faq, idx) => (
                <TableRow key={faq.id} className={idx % 2 === 1 ? "bg-gray-50/50" : ""}>
                  <TableCell className="px-4 py-3 font-medium text-[#0A3161] max-w-[240px] align-top">
                    <div className="fs-line-clamp-3" title={faq.question}>
                      {faq.question}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-[#2158A3] font-normal text-sm max-w-[240px] align-top">
                    <div className="fs-line-clamp-3" title={stripHtmlToText(faq.answer)}>
                      {stripHtmlToText(faq.answer) || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border",
                        getCategoryBadgeClass(faq.category),
                      ].join(" ")}
                    >
                      {faq.category}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        faq.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {faq.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-[#2158A3] font-normal text-sm">
                    {faq.createdAt}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewTarget(faq)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                        aria-label="View FAQ"
                      >
                        <FaRegEye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/faq/${faq.id}/edit`)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/18"
                        aria-label="Edit FAQ"
                      >
                        <FaRegEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(faq)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        aria-label="Delete FAQ"
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
                  No FAQs found
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
            <div className="relative w-[120px]">
              <select
                className={faqSelectClass}
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
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#2158A3]">
                ▾
              </span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600">
            Showing {totalFaqs === 0 ? 0 : start + 1}-{Math.min(start + rowsPerPage, totalFaqs)} of{" "}
            {totalFaqs} items
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

      <DeleteFaqModal
        open={!!deleteTarget}
        faq={deleteTarget}
        isDeleting={isDeletingFaq}
        onCancel={() => {
          if (!isDeletingFaq) setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteFaq}
      />

      <ViewFaqModal open={!!viewTarget} faq={viewTarget} onClose={() => setViewTarget(null)} />
    </div>
  );
}
