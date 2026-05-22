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
import {
  fetchCheatSheetItems,
  deleteCheatSheetItem,
  MACRO_TYPES,
} from "@/lib/nutritionCheatSheetApi";

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
        const list = await fetchCheatSheetItems({ token });
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const token = localStorage.getItem("token");
    setIsDeleting(true);
    try {
      await deleteCheatSheetItem(deleteTarget._id, { token });
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
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-12 rounded-xl border-[#C8D7E9]"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(macroFilter === "all")} onClick={() => setMacroFilter("all")}>
            All ({items.length})
          </button>
          {MACRO_TYPES.map((m) => (
            <button
              key={m.value}
              type="button"
              className={chip(macroFilter === m.value)}
              onClick={() => setMacroFilter(m.value)}
            >
              {m.label} ({counts[m.value] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#C8D7E9] bg-white shadow-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead>Food</TableHead>
              <TableHead>Serving</TableHead>
              <TableHead>Macro (g)</TableHead>
              <TableHead>Calories</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No items yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row._id}>
                  <TableCell>
                    <span className={`text-sm font-semibold ${MACRO_STYLE[row.macroType] || ""}`}>
                      {macroLabel(row.macroType)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.servingSize}</TableCell>
                  <TableCell className={`font-semibold ${MACRO_STYLE[row.macroType] || ""}`}>
                    {row.macroAmountGrams}g
                  </TableCell>
                  <TableCell>{row.calories} cal</TableCell>
                  <TableCell className="text-right">
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
                        onClick={() => setDeleteTarget(row)}
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

      {deleteTarget && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="font-semibold text-[#0A3161]">Delete cheat sheet item?</h3>
            <p className="mt-2 text-sm text-muted-foreground">{deleteTarget.name}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button className="bg-red-600" onClick={confirmDelete} disabled={isDeleting}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
