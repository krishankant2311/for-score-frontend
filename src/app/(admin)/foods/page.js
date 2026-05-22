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
import { LuApple } from "react-icons/lu";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";
import { fetchAllFoods, deleteFoodById, FOOD_CATEGORIES } from "@/lib/foodsApi";

const DEFAULT_ROWS_PER_PAGE = 6;

const CATEGORY_STYLES = {
  Protein: "bg-sky-100 text-sky-800 border-sky-200",
  Carbs: "bg-amber-100 text-amber-900 border-amber-200",
  Vegetables: "bg-emerald-100 text-emerald-900 border-emerald-200",
  Fruit: "bg-rose-100 text-rose-900 border-rose-200",
  Fats: "bg-violet-100 text-violet-900 border-violet-200",
  Other: "bg-slate-100 text-slate-800 border-slate-200",
};

function mapFoodRow(f) {
  return {
    id: f._id,
    name: f.name || "",
    category: f.category || "Other",
    servingSize: f.servingSize || "",
    calories: f.calories ?? 0,
    protein: f.protein ?? 0,
    carbs: f.carbs ?? 0,
    fats: f.fats ?? 0,
    image: f.image || "",
    status: f.status || "Active",
    createdAt: f.createdAt ? new Date(f.createdAt).toISOString().slice(0, 10) : "",
  };
}

export default function FoodsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [foods, setFoods] = useState([]);
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
        toast.error("Session expired. Please login again.");
        setIsFetching(false);
        return;
      }
      setIsFetching(true);
      try {
        const list = await fetchAllFoods({ token });
        setFoods(list.map(mapFoodRow));
      } catch (err) {
        toast.error(err?.adminPayload?.message || err?.message || "Failed to load foods");
        setFoods([]);
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    let list = foods.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.servingSize || "").toLowerCase().includes(q)
    );
    if (categoryFilter !== "all") list = list.filter((f) => f.category === categoryFilter);
    return list;
  }, [foods, searchTerm, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = filtered.slice(start, start + rowsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setIsDeleting(true);
    try {
      await deleteFoodById(deleteTarget.id, { token });
      toast.success(`"${deleteTarget.name}" removed.`);
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.adminPayload?.message || err?.message || "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const chip = (active) =>
    `rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
      active
        ? "border-[#0A3161] bg-[#0A3161] text-white"
        : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
    }`;

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <AdminHeaderCard
        title="Foods"
        subtitle="Food catalog shown in the app (search, filters, macros per serving)."
        stats={
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{foods.length}</span>
          </p>
        }
        actions={
          <Button
            className="rounded-xl bg-[#0A3161] hover:bg-[#0A3161]/90"
            onClick={() => router.push("/foods/new")}
          >
            + Add Food
          </Button>
        }
      />

      <div className="mt-6 space-y-4">
        <Input
          placeholder="Search foods..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="h-12 rounded-xl border-[#C8D7E9]"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(categoryFilter === "all")} onClick={() => setCategoryFilter("all")}>
            All ({foods.length})
          </button>
          {FOOD_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={chip(categoryFilter === c)}
              onClick={() => {
                setCategoryFilter(c);
                setCurrentPage(1);
              }}
            >
              {c === "Fats" ? "Healthy Fats" : c} ({foods.filter((f) => f.category === c).length})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#C8D7E9] bg-white shadow-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Food</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Serving</TableHead>
              <TableHead>Calories</TableHead>
              <TableHead>P / C / F (g)</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No foods found.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {f.image ? (
                        <img src={f.image} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A3161]/10 text-[#0A3161]">
                          <LuApple className="h-4 w-4" />
                        </span>
                      )}
                      {f.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        CATEGORY_STYLES[f.category] || CATEGORY_STYLES.Other
                      }`}
                    >
                      {f.category === "Fats" ? "Healthy Fats" : f.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.servingSize || "—"}</TableCell>
                  <TableCell>{f.calories} kcal</TableCell>
                  <TableCell className="text-sm">
                    {f.protein} / {f.carbs} / {f.fats}
                  </TableCell>
                  <TableCell>{f.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/foods/${f.id}/edit`)}
                        className="rounded-lg border border-[#C8D7E9] p-2 hover:bg-[#F2F5FA]"
                        aria-label="Edit"
                      >
                        <FaRegEdit />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(f)}
                        className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                        aria-label="Delete"
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#0A3161]">Delete food?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Remove <strong>{deleteTarget.name}</strong> from the app catalog?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
