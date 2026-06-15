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
import { FaRegEdit } from "react-icons/fa";
import { HiOutlineTrash } from "react-icons/hi";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";
import AdminPagination from "@/components/admin/AdminPagination";
import {
  fetchAllCheatSheetItems,
  deleteCheatSheetItem,
  MACRO_TYPES,
} from "@/lib/nutritionCheatSheetApi";

const DEFAULT_ROWS_PER_PAGE = 6;

const MACRO_STYLE = {
  protein: "text-sky-700",
  carb: "text-rose-700",
  fat: "text-indigo-800",
};

function macroLabel(type) {
  return MACRO_TYPES.find((m) => m.value === type)?.label || type;
}

export default function NutritionCheatSheetPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [macroFilter, setMacroFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
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
        const list = await fetchAllCheatSheetItems({ token });
        setItems(list);
      } catch (err) {
        toast.error(err?.message || "Failed to load");
        setItems([]);
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    let list = items.filter(
      (i) =>
        (i.name || "").toLowerCase().includes(q) ||
        (i.servingSize || "").toLowerCase().includes(q)
    );
    if (macroFilter !== "all") list = list.filter((i) => i.macroType === macroFilter);
    return list;
  }, [items, searchTerm, macroFilter]);

  const counts = useMemo(() => {
    const c = { protein: 0, carb: 0, fat: 0 };
    for (const i of items) if (c[i.macroType] != null) c[i.macroType]++;
    return c;
  }, [items]);

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
      toast.error("Session expired. Please login again.", { id: "cheat-sheet-delete-auth" });
      return;
    }
    const itemId = String(deleteTarget._id || deleteTarget.id || "").trim();
    if (!itemId) {
      toast.error("Invalid item. Please refresh and try again.", { id: "cheat-sheet-delete-id" });
      return;
    }
    setIsDeleting(true);
    try {
      await deleteCheatSheetItem(itemId, { token });
      toast.success("Item removed");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const chip = (active) =>
    `rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
      active ? "border-[#0A3161] bg-[#0A3161] text-white" : "border-[#C8D7E9] bg-white text-[#2158A3]"
    }`;

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <AdminHeaderCard
        title="Nutrition Cheat Sheet"
        subtitle="Quick macro reference in the app (Protein / Carb / Fat sources)."
        stats={
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold">{items.length}</span>
          </p>
        }
        actions={
          <Button className="rounded-xl bg-[#0A3161]" onClick={() => router.push("/nutrition-cheat-sheet/new")}>
            + Add Item
          </Button>
        }
      />

      <div className="mt-6 space-y-4">
        <Input
          placeholder="Search by name or serving…"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="h-12 rounded-xl border-[#C8D7E9]"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={chip(macroFilter === "all")}
            onClick={() => {
              setMacroFilter("all");
              setCurrentPage(1);
            }}
          >
            All ({items.length})
          </button>
          {MACRO_TYPES.map((m) => (
            <button
              key={m.value}
              type="button"
              className={chip(macroFilter === m.value)}
              onClick={() => {
                setMacroFilter(m.value);
                setCurrentPage(1);
              }}
            >
              {m.label} ({counts[m.value] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#C8D7E9] bg-white shadow-md">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[#F2F5FA]">
            <TableRow className="border-b bg-[#F2F5FA]">
              <TableHead className="min-w-[100px] px-4 py-3 align-middle font-semibold text-[#2158A3]">
                Section
              </TableHead>
              <TableHead className="min-w-[180px] px-4 py-3 align-middle font-semibold text-[#2158A3]">
                Food
              </TableHead>
              <TableHead className="min-w-[140px] px-4 py-3 align-middle font-semibold text-[#2158A3]">
                Serving
              </TableHead>
              <TableHead className="min-w-[100px] px-4 py-3 align-middle font-semibold text-[#2158A3]">
                Macro (g)
              </TableHead>
              <TableHead className="min-w-[90px] px-4 py-3 align-middle font-semibold text-[#2158A3]">
                Calories
              </TableHead>
              <TableHead className="min-w-[148px] w-[148px] px-4 py-3 text-right align-middle font-semibold text-[#2158A3]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  Loading Nutrition cheat sheets…
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {items.length === 0
                    ? "No items yet."
                    : searchTerm || macroFilter !== "all"
                      ? "No data found."
                      : "No items on this page."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row) => (
                <TableRow key={row._id}>
                  <TableCell className="align-middle whitespace-normal">
                    <span className={`text-sm font-semibold ${MACRO_STYLE[row.macroType] || ""}`}>
                      {macroLabel(row.macroType)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[220px] align-middle whitespace-normal font-medium">
                    <span className="break-words leading-snug" title={row.name}>
                      {row.name}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[180px] align-middle whitespace-normal text-muted-foreground">
                    <span className="break-words leading-snug" title={row.servingSize}>
                      {row.servingSize}
                    </span>
                  </TableCell>
                  <TableCell className={`align-middle whitespace-normal font-semibold ${MACRO_STYLE[row.macroType] || ""}`}>
                    {row.macroAmountGrams}g
                  </TableCell>
                  <TableCell className="align-middle whitespace-normal">{row.calories} cal</TableCell>
                  <TableCell className="min-w-[148px] w-[148px] align-middle px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border p-2 hover:bg-[#F2F5FA]"
                        onClick={() => router.push(`/nutrition-cheat-sheet/${row._id}/edit`)}
                      >
                        <FaRegEdit />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 p-2 text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(row);
                        }}
                      >
                        <HiOutlineTrash />
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
            <h3 className="font-semibold text-[#0A3161]">Delete cheat sheet item?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This action cannot be undone. The item will be removed from the cheat sheet.
            </p>
            <p className="mt-2 max-h-24 overflow-y-auto break-words text-sm font-medium text-[#0A3161]">
              {deleteTarget.name}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button type="button" className="bg-red-600" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
