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
import { HiOutlineTrash, HiOutlineEye, HiOutlineX } from "react-icons/hi";
import { LuApple, LuScale, LuFlame, LuLayers } from "react-icons/lu";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";
import AdminPagination from "@/components/admin/AdminPagination";
import { fetchAllFoods, deleteFoodById, fetchFoodCategories } from "@/lib/foodsApi";

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
    brand: f.brand || "",
    category: f.category || "Other",
    mealType: f.mealType || "Other",
    servingSize: f.servingSize || "",
    servingGrams: f.servingGrams ?? null,
    calories: f.calories ?? 0,
    protein: f.protein ?? 0,
    carbs: f.carbs ?? 0,
    fats: f.fats ?? 0,
    calories_per_100g: f.calories_per_100g ?? 0,
    protein_g_per_100g: f.protein_g_per_100g ?? 0,
    carbs_g_per_100g: f.carbs_g_per_100g ?? 0,
    fat_g_per_100g: f.fat_g_per_100g ?? 0,
    fiber: f.fiber ?? 0,
    sugar: f.sugar ?? 0,
    sodium: f.sodium ?? 0,
    upc: f.upc || "",
    servingSizes: Array.isArray(f.servingSizes) ? f.servingSizes : [],
    image: f.image || "",
    status: f.status || "Active",
    createdByUserId: f.createdByUserId ? String(f.createdByUserId) : "",
    createdAt: f.createdAt ? new Date(f.createdAt).toISOString().slice(0, 10) : "",
  };
}

export default function FoodsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rawFoods, setRawFoods] = useState([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverAllCount, setServerAllCount] = useState(0);
  const [serverCategoryCounts, setServerCategoryCounts] = useState({});
  const [categoriesList, setCategoriesList] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const loadCategories = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      const cats = await fetchFoodCategories({ token });
      if (Array.isArray(cats) && cats.length > 0) setCategoriesList(cats);
    };
    loadCategories();
  }, [refreshKey]);

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
        const data = await fetchAllFoods({
          token,
          search: debouncedSearch,
          category: categoryFilter,
          page: currentPage,
          limit: rowsPerPage,
        });

        const items = (data.items || []).map(mapFoodRow);
        setRawFoods(items);
        setServerTotal(data.total || 0);
        if (data.categoryCounts && Object.keys(data.categoryCounts).length > 0) {
          setServerCategoryCounts(data.categoryCounts);
        }
        if (data.allCount != null) setServerAllCount(data.allCount);
      } catch (err) {
        toast.error(err?.adminPayload?.message || err?.message || "Failed to load foods");
        setRawFoods([]);
        setServerTotal(0);
      } finally {
        setIsFetching(false);
      }
    };
    load();
  }, [
    refreshKey,
    debouncedSearch,
    categoryFilter,
    currentPage,
    rowsPerPage,
  ]);

  // Compute category counts across all foods
  const categoryCounts = useMemo(() => {
    if (serverCategoryCounts && Object.keys(serverCategoryCounts).length > 0) {
      return serverCategoryCounts;
    }
    const counts = {};
    for (const f of rawFoods) {
      const cat = f.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [serverCategoryCounts, rawFoods]);

  const allCount = useMemo(() => {
    if (serverAllCount > 0) return serverAllCount;
    return serverTotal || rawFoods.length;
  }, [serverAllCount, serverTotal, rawFoods]);

  const totalItems = serverTotal;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const paginatedFoods = rawFoods;

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
        ? "border-[#0A3161] bg-[#0A3161] text-white shadow-sm"
        : "border-[#C8D7E9] bg-white text-[#2158A3] hover:bg-[#F2F5FA]"
    }`;

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <AdminHeaderCard
        title="Foods"
        subtitle="Comprehensive food catalog with serving sizes, brand names, and full macro breakdowns."
        stats={
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{allCount}</span>
          </p>
        }
        actions={
          <Button
            className="rounded-xl bg-[#0A3161] hover:bg-[#0A3161]/90 shadow-md text-white font-medium"
            onClick={() => router.push("/foods/new")}
          >
            + Add Food
          </Button>
        }
      />

      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by name, brand, or serving size..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-12 flex-1 rounded-xl border-[#C8D7E9]"
          />
          <div className="relative min-w-[240px]">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-12 w-full rounded-xl border border-[#C8D7E9] bg-white px-4 py-2 text-sm font-medium text-[#0A3161] shadow-sm focus:border-[#0A3161] focus:outline-none"
            >
              <option value="all">All Categories ({allCount})</option>
              {categoriesList.map((c) => (
                <option key={c} value={c}>
                  {c} {categoryCounts[c] != null ? `(${categoryCounts[c]})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={chip(categoryFilter === "all")}
            onClick={() => {
              setCategoryFilter("all");
              setCurrentPage(1);
            }}
          >
            All ({allCount})
          </button>
          {categoryFilter !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#0A3161] bg-[#0A3161] px-3.5 py-2 text-sm font-medium text-white shadow-sm">
              <span>Category: {categoryFilter} ({categoryCounts[categoryFilter] ?? serverTotal})</span>
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("all");
                  setCurrentPage(1);
                }}
                className="rounded-full p-0.5 hover:bg-white/20"
                title="Clear filter"
              >
                <HiOutlineX className="h-4 w-4" />
              </button>
            </span>
          )}
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
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0A3161] border-t-transparent" />
                    <span className="text-sm">Loading Food…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedFoods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No foods found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedFoods.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="max-w-[280px] font-medium align-top whitespace-normal">
                    <div className="flex items-start gap-2.5">
                      {f.image ? (
                        <img
                          src={f.image}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover border border-[#C8D7E9]"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0A3161]/10 text-[#0A3161]">
                          <LuApple className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <span
                          className="break-words leading-snug font-semibold text-[#0A3161]"
                          title={f.name}
                        >
                          {f.name}
                        </span>
                        {f.brand && (
                          <span className="block text-xs font-normal text-[#2158A3] mt-0.5">
                            {f.brand}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex max-w-[200px] truncate rounded-full border border-[#C8D7E9] bg-[#F2F5FA] px-2.5 py-0.5 text-xs font-medium text-[#0A3161]"
                      title={f.category}
                    >
                      {f.category}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] align-top whitespace-normal text-sm text-muted-foreground">
                    <span className="break-words leading-snug" title={f.servingSize || undefined}>
                      {f.servingSize || "—"}
                    </span>
                    {f.servingGrams ? (
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        ({f.servingGrams}g)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-semibold text-[#0A3161]">
                    {f.calories} kcal
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    <span className="text-sky-700">{f.protein}p</span> /{" "}
                    <span className="text-amber-700">{f.carbs}c</span> /{" "}
                    <span className="text-rose-700">{f.fats}f</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {/* View details modal button */}
                      <button
                        type="button"
                        onClick={() => setViewTarget(f)}
                        className="rounded-lg border border-[#C8D7E9] p-2 text-[#0A3161] hover:bg-[#F2F5FA] transition-colors"
                        aria-label="View details"
                        title="View details"
                      >
                        <HiOutlineEye />
                      </button>

                      {f.createdByUserId ? (
                        <span
                          className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800"
                          title="User-added food cannot be edited by admin"
                        >
                          User added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => router.push(`/foods/${f.id}/edit`)}
                          className="rounded-lg border border-[#C8D7E9] p-2 hover:bg-[#F2F5FA] text-[#0A3161] transition-colors"
                          aria-label="Edit"
                          title="Edit"
                        >
                          <FaRegEdit />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(f)}
                        className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete"
                        title="Delete"
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
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={(n) => {
          setRowsPerPage(n);
          setCurrentPage(1);
        }}
      />

      {/* View Detail Modal */}
      {viewTarget && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#E3ECF8] pb-3">
              <div className="flex items-center gap-3">
                {viewTarget.image ? (
                  <img
                    src={viewTarget.image}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover border border-[#C8D7E9]"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A3161]/10 text-[#0A3161]">
                    <LuApple className="h-6 w-6" />
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-bold text-[#0A3161]">{viewTarget.name}</h3>
                  {viewTarget.brand && (
                    <p className="text-xs font-medium text-[#2158A3]">{viewTarget.brand}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewTarget(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#F2F5FA]"
              >
                <HiOutlineX className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Category & Meal Type & UPC */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-medium text-sky-800">
                  Category: {viewTarget.category}
                </span>
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-medium text-indigo-800">
                  Meal Type: {viewTarget.mealType}
                </span>
                {viewTarget.upc && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-slate-700">
                    UPC: {viewTarget.upc}
                  </span>
                )}
              </div>

              {/* Serving Info */}
              <div className="rounded-xl border border-[#E3ECF8] bg-[#F8FAFC] p-3 text-xs space-y-1">
                <p className="font-semibold text-[#0A3161]">
                  Serving:{" "}
                  <span className="font-normal text-foreground">
                    {viewTarget.servingSize || "Not specified"}
                  </span>
                </p>
                {viewTarget.servingGrams && (
                  <p className="font-semibold text-[#0A3161]">
                    Serving Weight:{" "}
                    <span className="font-normal text-foreground">
                      {viewTarget.servingGrams} grams
                    </span>
                  </p>
                )}
              </div>

              {/* Per Serving Macros */}
              <div>
                <h4 className="text-xs font-semibold text-[#0A3161] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <LuFlame className="h-3.5 w-3.5 text-amber-500" /> Per Serving
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-xl border border-[#C8D7E9] bg-white p-2.5">
                    <p className="text-muted-foreground">Calories</p>
                    <p className="text-base font-bold text-[#0A3161] mt-0.5">
                      {viewTarget.calories}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-2.5">
                    <p className="text-sky-700">Protein</p>
                    <p className="text-base font-bold text-sky-900 mt-0.5">
                      {viewTarget.protein}g
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5">
                    <p className="text-amber-700">Carbs</p>
                    <p className="text-base font-bold text-amber-900 mt-0.5">
                      {viewTarget.carbs}g
                    </p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2.5">
                    <p className="text-rose-700">Fat</p>
                    <p className="text-base font-bold text-rose-900 mt-0.5">
                      {viewTarget.fats}g
                    </p>
                  </div>
                </div>
              </div>

              {/* Per 100g Nutrition */}
              {(viewTarget.calories_per_100g > 0 ||
                viewTarget.protein_g_per_100g > 0 ||
                viewTarget.carbs_g_per_100g > 0 ||
                viewTarget.fat_g_per_100g > 0) && (
                <div>
                  <h4 className="text-xs font-semibold text-[#0A3161] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <LuLayers className="h-3.5 w-3.5 text-[#2158A3]" /> Nutrition per 100g
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-[#E3ECF8] bg-slate-50 p-2">
                      <p className="text-muted-foreground">Calories</p>
                      <p className="font-semibold text-foreground">
                        {viewTarget.calories_per_100g}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#E3ECF8] bg-slate-50 p-2">
                      <p className="text-muted-foreground">Protein</p>
                      <p className="font-semibold text-foreground">
                        {viewTarget.protein_g_per_100g}g
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#E3ECF8] bg-slate-50 p-2">
                      <p className="text-muted-foreground">Carbs</p>
                      <p className="font-semibold text-foreground">
                        {viewTarget.carbs_g_per_100g}g
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#E3ECF8] bg-slate-50 p-2">
                      <p className="text-muted-foreground">Fat</p>
                      <p className="font-semibold text-foreground">
                        {viewTarget.fat_g_per_100g}g
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Micronutrients */}
              {(viewTarget.fiber > 0 || viewTarget.sugar > 0 || viewTarget.sodium > 0) && (
                <div>
                  <h4 className="text-xs font-semibold text-[#0A3161] uppercase tracking-wider mb-2">
                    Secondary Nutrients
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-[#E3ECF8] p-2">
                      <p className="text-muted-foreground">Fiber</p>
                      <p className="font-semibold text-foreground">{viewTarget.fiber}g</p>
                    </div>
                    <div className="rounded-xl border border-[#E3ECF8] p-2">
                      <p className="text-muted-foreground">Sugar</p>
                      <p className="font-semibold text-foreground">{viewTarget.sugar}g</p>
                    </div>
                    <div className="rounded-xl border border-[#E3ECF8] p-2">
                      <p className="text-muted-foreground">Sodium</p>
                      <p className="font-semibold text-foreground">{viewTarget.sodium}mg</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Serving Sizes */}
              {viewTarget.servingSizes && viewTarget.servingSizes.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[#0A3161] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <LuScale className="h-3.5 w-3.5 text-[#2158A3]" /> Alternative Portions
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {viewTarget.servingSizes.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-[#E3ECF8] bg-white px-3 py-1.5 text-xs"
                      >
                        <span className="font-medium text-[#0A3161]">
                          {s.servingDescription || `${s.servingGrams}g`}
                        </span>
                        <span className="text-muted-foreground">
                          {s.calories} kcal ({s.protein}p / {s.carbs}c / {s.fats}f)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-[#E3ECF8] pt-4">
              {!viewTarget.createdByUserId && (
                <Button
                  className="bg-[#0A3161] text-white"
                  onClick={() => {
                    const id = viewTarget.id;
                    setViewTarget(null);
                    router.push(`/foods/${id}/edit`);
                  }}
                >
                  Edit This Food
                </Button>
              )}
              <Button variant="outline" onClick={() => setViewTarget(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#0A3161]">Delete food?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Remove this item from the app catalog?
            </p>
            <p className="mt-1 max-h-24 overflow-y-auto break-words text-sm font-medium text-[#0A3161]">
              {deleteTarget.name}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
