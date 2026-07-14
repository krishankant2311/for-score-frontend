"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { FaRegEdit, FaRegEye } from "react-icons/fa";
import { HiOutlineTrash } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { deleteStretchProgram, fetchAllStretchPrograms } from "@/lib/stretchProgramApi";
import ViewStretchProgramModal from "./components/ViewStretchProgramModal";

const DEFAULT_ROWS_PER_PAGE = 6;

export default function StretchProgramsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Session expired");
        setIsFetching(false);
        return;
      }
      setIsFetching(true);
      try {
        const list = await fetchAllStretchPrograms({ token });
        setItems(list);
      } catch (err) {
        toast.error(err?.message || "Failed to load stretch programs");
        setItems([]);
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return items.filter(
      (i) =>
        (i.title || "").toLowerCase().includes(q) ||
        (i.intro || i.description || "").toLowerCase().includes(q) ||
        (i.category || "").toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = filtered.slice(start, start + rowsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Session expired");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteStretchProgram(deleteTarget._id, { token });
      toast.success("Stretch program deleted");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <AdminHeaderCard
        title="Stretch Programs"
        subtitle="Recover routines with movement sequences for the mobile app."
        stats={
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold">{items.length}</span>
          </p>
        }
        actions={
          <Button className="rounded-xl bg-[#0A3161]" onClick={() => router.push("/stretch-programs/new")}>
            + Add Stretch Program
          </Button>
        }
      />

      <div className="mt-6">
        <Input
          placeholder="Search by title, category, or intro…"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="h-12 rounded-xl border-[#C8D7E9]"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#C8D7E9] bg-white shadow-md">
        <Table className="min-w-[1000px]">
          <TableHeader className="sticky top-0 z-10 bg-[#F2F5FA]">
            <TableRow>
              <TableHead className="px-4 py-3 font-semibold text-[#2158A3]">PROGRAM</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-[#2158A3]">CATEGORY</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-[#2158A3]">DURATION</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-[#2158A3]">MOVEMENTS</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-[#2158A3]">LEVEL</TableHead>
              <TableHead className="px-4 py-3 font-semibold text-[#2158A3]">STATUS</TableHead>
              <TableHead className="px-4 py-3 text-right font-semibold text-[#2158A3]">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Loading stretch programs…
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {items.length === 0 ? "No stretch programs yet. Add one to get started." : "No data found."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row) => (
                <TableRow key={row._id}>
                  <TableCell className="max-w-[280px] px-4 py-3 align-top whitespace-normal font-medium text-[#0A3161]">
                    <p className="break-words leading-snug">{row.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-normal text-[#5671A6]">
                      {row.intro || row.description || "—"}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle">{row.category || "Recover"}</TableCell>
                  <TableCell className="px-4 py-3 align-middle">{row.durationMinutes} min</TableCell>
                  <TableCell className="px-4 py-3 align-middle">
                    {Array.isArray(row.movements) ? row.movements.length : row.stretchCount || 0}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle">{row.level || "All Levels"}</TableCell>
                  <TableCell className="px-4 py-3 align-middle">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {row.status || "Active"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#C8D7E9] text-gray-700 hover:bg-[#F2F5FA]"
                        onClick={() => setViewTarget(row)}
                        aria-label="View"
                      >
                        <FaRegEye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#C8D7E9] text-[#0A3161] hover:bg-[#F2F5FA]"
                        onClick={() => router.push(`/stretch-programs/${row._id}/edit`)}
                        aria-label="Edit"
                      >
                        <FaRegEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget(row)}
                        aria-label="Delete"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
        totalItems={filtered.length}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={(n) => {
          setRowsPerPage(n);
          setCurrentPage(1);
        }}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="font-semibold text-[#0A3161]">Delete stretch program?</h3>
            <p className="mt-2 text-sm text-muted-foreground">{deleteTarget.title}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button className="bg-red-600" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ViewStretchProgramModal
        open={!!viewTarget}
        program={viewTarget}
        onClose={() => setViewTarget(null)}
      />
    </div>
  );
}
