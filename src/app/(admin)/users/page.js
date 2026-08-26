"use client";

import { useEffect, useMemo, useState } from "react";
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
import { FaRegEye } from "react-icons/fa";
import { MdBlock, MdLockOpen } from "react-icons/md";
import { toast } from "react-hot-toast";
import ViewUserModal from "./components/ViewUserModal";
import BlockUserModal from "./components/BlockUserModal";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";
import { joinAdminPath } from "@/lib/subscriptionPlanApi";

/** Backend shapes differ — accept users array from common paths */
function extractUsersArray(payload) {
  if (!payload || typeof payload !== "object") return [];
  const result = payload.result ?? payload.data ?? payload;
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const list =
      result.users ??
      result.userList ??
      result.docs ??
      result.items ??
      result.rows ??
      result.records;
    if (Array.isArray(list)) return list;
    if (Array.isArray(result.data)) return result.data;
  }
  if (Array.isArray(payload.users)) return payload.users;
  return [];
}

function extractListMeta(payload, pageLimit) {
  const result = payload?.result ?? payload?.data;
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return { total: 0, totalPages: 1 };
  }
  let total = result.total ?? result.totalCount ?? result.count ?? result.totalRecords;
  if (total == null || total === "") {
    const arr =
      result.users ?? result.docs ?? result.items ?? (Array.isArray(result.data) ? result.data : null);
    total = Array.isArray(arr) ? arr.length : 0;
  }
  const tNum = typeof total === "number" && Number.isFinite(total) ? total : Number(total) || 0;
  const lim =
    typeof result.limit === "number" && result.limit > 0
      ? result.limit
      : pageLimit > 0
        ? pageLimit
        : 10;
  let totalPages = result.totalPages;
  if (typeof totalPages !== "number" || !Number.isFinite(totalPages) || totalPages < 1) {
    totalPages = Math.max(1, Math.ceil(tNum / lim));
  }
  return { total: tNum, totalPages };
}

function normalizeStatus(raw) {
  const s = String(raw ?? "Active").trim().toLowerCase();
  if (s === "blocked" || s === "inactive" || s === "suspended" || s === "banned") return "Blocked";
  if (s === "deleted") return "Deleted";
  if (s === "pending") return "Pending";
  if (s === "active") return "Active";
  return "Active";
}

function parseWorkoutPreferences(raw) {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  return String(raw)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatWorkoutSkillLevel(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const key = s.toUpperCase();
  if (key === "BEGINNER") return "Beginner";
  if (key === "INTERMEDIATE") return "Intermediate";
  if (key === "ADVANCED") return "Advanced";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatPreferenceLabel(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/\s/.test(s)) return s;
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSkillLevelBadgeClass(level) {
  const key = String(level ?? "").toLowerCase();
  if (key.includes("beginner")) return "border-sky-200 bg-sky-50 text-sky-800";
  if (key.includes("intermediate")) return "border-amber-200 bg-amber-50 text-amber-800";
  if (key.includes("advanced")) return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-indigo-100 bg-indigo-50 text-[#0A3161]";
}

function getUserStatusBadgeClass(status) {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Blocked":
      return "bg-red-100 text-red-800";
    case "Pending":
      return "bg-amber-100 text-amber-900";
    case "Deleted":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export default function UserManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'blocked' | 'pending'
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [users, setUsers] = useState([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  /** DB-wide counts from GET /get-user-stats (not current page length) */
  const [userStats, setUserStats] = useState({ total: 0, active: 0, blocked: 0, pending: 0 });
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [usersRefreshKey, setUsersRefreshKey] = useState(0);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null);

  const handleView = (id) => {
    const user = users.find((u) => u.id === id);
    setViewTarget(user || null);
  };

  const handleBlock = (id) => {
    const user = users.find((u) => u.id === id);
    setBlockTarget(user || null);
  };

  const totalPages = Math.max(1, serverTotalPages || 1);
  const start = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = users;

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 350);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

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
    const fetchUserStats = async () => {
      const token = localStorage.getItem("token");
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
      if (!baseUrl || !token) return;

      try {
        const res = await axios.get(joinAdminPath(baseUrl, "get-user-stats"), {
          headers: { token, Authorization: `Bearer ${token}` },
        });
        const r = res?.data?.result ?? {};
        setUserStats({
          total: Number(r.total) || 0,
          active: Number(r.active) || 0,
          blocked: Number(r.blocked) || 0,
          pending: Number(r.pending) || 0,
        });
      } catch (err) {
        console.error("Fetch user stats failed:", err?.response?.data || err?.message);
      }
    };

    fetchUserStats();
  }, [statsRefreshKey]);

  useEffect(() => {
    const fetchUsers = async () => {
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

      setIsFetchingUsers(true);
      try {
        const params = {
          page: currentPage,
          limit: rowsPerPage,
        };

        const trimmedSearch = debouncedSearchTerm.trim();
        if (trimmedSearch) params.search = trimmedSearch;

        if (statusFilter === "active") params.status = "Active";
        if (statusFilter === "blocked") params.status = "Blocked";
        if (statusFilter === "pending") params.status = "Pending";

        const url = joinAdminPath(baseUrl, "get-all-users");
        const res = await axios.get(url, {
          headers: { token, Authorization: `Bearer ${token}` },
          params,
        });

        const payload = res?.data ?? {};
        const rawUsers = extractUsersArray(payload);
        const { total: serverTotal, totalPages: serverPages } = extractListMeta(payload, rowsPerPage);
        const apiOrigin = String(baseUrl).replace(/\/$/, "");

        // Map backend user shape into the fields expected by this UI.
        const mappedUsers = rawUsers.map((u) => {
          const joinDate = u?.createdAt
            ? new Date(u.createdAt).toISOString().slice(0, 10)
            : "";

          const photoRaw = u?.profilePhoto ?? u?.profile_photo ?? u?.photo ?? "";
          let profilePhotoUrl = "";
          if (photoRaw) {
            const raw = String(photoRaw).trim().replace(/\\/g, "/");
            if (/^https?:\/\//i.test(raw)) profilePhotoUrl = raw;
            else if (raw.includes("/uploads/")) {
              profilePhotoUrl = `${apiOrigin}${raw.slice(raw.toLowerCase().lastIndexOf("/uploads/"))}`;
            } else if (raw.startsWith("uploads/")) {
              profilePhotoUrl = `${apiOrigin}/${raw}`;
            } else if (!raw.includes("/")) {
              profilePhotoUrl = `${apiOrigin}/uploads/${raw}`;
            } else {
              profilePhotoUrl = raw.startsWith("/") ? `${apiOrigin}${raw}` : `${apiOrigin}/${raw}`;
            }
          }

          return {
            id: u?._id ?? u?.id ?? u?.userId,
            name: u?.name ?? "",
            email: u?.email ?? "",
            age: u?.age != null && u?.age !== "" ? String(u.age) : "",
            height: u?.height != null && u?.height !== "" ? String(u.height) : "",
            weight: u?.weight != null && u?.weight !== "" ? String(u.weight) : "",
            profilePhotoUrl,
            goal: u?.fitnessTarget ?? u?.goalDuration ?? "",
            skillLevel: formatWorkoutSkillLevel(u?.workoutSkillLevel),
            workoutPreferences: parseWorkoutPreferences(u?.workoutPreferences).map(formatPreferenceLabel),
            weeklyDays:
              typeof u?.workoutFrequency === "number"
                ? `${u.workoutFrequency} days`
                : u?.workoutFrequency
                  ? `${u.workoutFrequency} days`
                  : "",
            status: normalizeStatus(u?.status),
            joinDate,
          };
        });

        setUsers(mappedUsers);
        setTotalUsers(serverTotal);
        setServerTotalPages(serverPages);
      } catch (err) {
        console.error("Fetch users failed:", err?.response?.data || err?.message);
        toast.error(err?.response?.data?.message || "Failed to fetch users");
      } finally {
        setIsFetchingUsers(false);
      }
    };

    fetchUsers();
  }, [currentPage, rowsPerPage, statusFilter, debouncedSearchTerm, usersRefreshKey]);

  const handleBlockConfirm = async () => {
    if (!blockTarget || isBlockingUser) return;

    const token = localStorage.getItem("token");
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!baseUrl) {
      toast.error("API base URL is missing.");
      return;
    }
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    const isCurrentlyBlocked = blockTarget.status === "Blocked";
    const updatedStatus = isCurrentlyBlocked ? "Active" : "Blocked";
    const userName = blockTarget.name;
    const userId = blockTarget.id;

    setIsBlockingUser(true);
    try {
      const res = await axios.post(
        joinAdminPath(baseUrl, `userstatus/${encodeURIComponent(userId)}`),
        { status: updatedStatus },
        {
          headers: {
            token,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res?.data?.success) {
        throw new Error(res?.data?.message || "Failed to update user status");
      }

      setBlockTarget(null);
      setStatsRefreshKey((k) => k + 1);
      setUsersRefreshKey((k) => k + 1);
      toast.success(
        `User "${userName}" ${updatedStatus === "Blocked" ? "blocked" : "unblocked"} successfully.`
      );
    } catch (err) {
      console.error("Block user failed:", err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || err?.message || "Failed to update user status");
    } finally {
      setIsBlockingUser(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <AdminHeaderCard
        title="User Management"
        subtitle="Search, filter, and manage user accounts."
        stats={
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{userStats.total}</span>
            <span className="mx-2 text-muted-foreground/60">|</span>
            Active:{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{userStats.active}</span>
            <span className="mx-2 text-muted-foreground/60">|</span>
            Blocked:{" "}
            <span className="font-semibold text-rose-700 dark:text-rose-300">{userStats.blocked}</span>
            <span className="mx-2 text-muted-foreground/60">|</span>
            Pending:{" "}
            <span className="font-semibold text-amber-700 dark:text-amber-300">{userStats.pending}</span>
          </p>
        }
      />

      {/* Search */}
      <div className="p-4 mt-6 bg-white rounded-lg border border-[#C8D7E9] shadow-md">
        <div className="">
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border-[#C8D7E9] rounded-md"
          />
        </div>

        {/* Filter tabs: All Users | Active | Blocked | Pending */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {[
            { key: "all", label: `All Users (${userStats.total})` },
            { key: "active", label: `Active (${userStats.active})` },
            { key: "blocked", label: `Blocked (${userStats.blocked})` },
            { key: "pending", label: `Pending (${userStats.pending})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setStatusFilter(key);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === key
                ? "bg-[#1e3a5f] text-white"
                : "bg-white text-[#1e3a5f] border border-gray-300 hover:bg-gray-50"
                }`}
            >
              {label}
            </button>
          ))}
        </div>


      </div>

      {/* Table */}
      <div className="mt-6 w-full max-h-[500px] overflow-auto border border-[#C8D7E9] rounded-lg shadow-md">
        <Table unwrap className="min-w-[1320px] w-full table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-[#F2F5FA]">
            <TableRow className="border-b bg-[#F2F5FA]">
              <TableHead className="sticky left-0 z-20 w-[12%] min-w-[170px] bg-[#F2F5FA] px-4 py-3 align-middle font-semibold text-[#2158A3] shadow-[6px_0_10px_-10px_rgba(10,49,97,0.45)]">NAME</TableHead>
              <TableHead className="w-[16%] px-4 py-3 align-middle font-semibold text-[#2158A3]">EMAIL</TableHead>
              <TableHead className="w-[10%] px-4 py-3 align-middle font-semibold text-[#2158A3]">GOAL</TableHead>
              <TableHead className="w-[9%] px-4 py-3 align-middle font-semibold text-[#2158A3]">SKILL LEVEL</TableHead>
              <TableHead className="w-[13%] px-4 py-3 align-middle font-semibold text-[#2158A3]">PREFERENCES</TableHead>
              <TableHead className="w-[9%] px-4 py-3 align-middle font-semibold text-[#2158A3]">WEEKLY DAYS</TableHead>
              <TableHead className="w-[8%] px-4 py-3 align-middle font-semibold text-[#2158A3]">STATUS</TableHead>
              <TableHead className="w-[9%] px-4 py-3 align-middle font-semibold text-[#2158A3]">JOIN DATE</TableHead>
              <TableHead className="sticky right-0 z-20 w-[10%] min-w-[120px] bg-[#F2F5FA] px-4 py-3 align-middle text-right font-semibold text-[#2158A3] shadow-[-6px_0_10px_-10px_rgba(10,49,97,0.45)]">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {isFetchingUsers ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : paginatedUsers.length > 0 ? (
              paginatedUsers.map((user, idx) => (
                <TableRow
                  key={user.id != null && user.id !== "" ? String(user.id) : `user-row-${idx}-${user.email || ""}`}
                  className={idx % 2 === 1 ? "bg-gray-50/50" : ""}
                >
                  <TableCell className={`sticky left-0 z-10 px-4 py-3 align-middle whitespace-normal shadow-[6px_0_10px_-10px_rgba(10,49,97,0.35)] ${idx % 2 === 1 ? "bg-gray-50" : "bg-white"}`}>
                    <p className="break-words font-medium leading-snug text-[#0A3161]" title={user.name}>
                      {user.name || "—"}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle whitespace-normal">
                    <p className="break-all text-sm font-normal leading-snug text-[#2158A3]" title={user.email}>
                      {user.email || "—"}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle whitespace-normal">
                    <span className="inline-flex w-full min-w-0 max-w-full items-center whitespace-normal break-all rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium leading-snug text-[#0A3161]">
                      {user.goal || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle whitespace-nowrap">
                    {user.skillLevel ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getSkillLevelBadgeClass(user.skillLevel)}`}
                      >
                        {user.skillLevel}
                      </span>
                    ) : (
                      <span className="text-sm text-[#2158A3]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle whitespace-normal">
                    {user.workoutPreferences.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {user.workoutPreferences.map((pref) => (
                          <span
                            key={pref}
                            className="inline-flex max-w-full items-center whitespace-normal break-words rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-[#0A3161] border border-indigo-100"
                          >
                            {pref}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-[#2158A3]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle whitespace-nowrap text-sm font-normal text-[#2158A3]">
                    {user.weeklyDays || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getUserStatusBadgeClass(user.status)}`}
                    >
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle whitespace-nowrap text-sm font-normal text-[#2158A3]">
                    {user.joinDate || "—"}
                  </TableCell>
                  <TableCell className={`sticky right-0 z-10 px-4 py-3 align-middle shadow-[-6px_0_10px_-10px_rgba(10,49,97,0.35)] ${idx % 2 === 1 ? "bg-gray-50" : "bg-white"}`}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleView(user.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                        aria-label="View user"
                      >
                        <FaRegEye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBlock(user.id)}
                        className={[
                          "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                          user.status === "Blocked"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-rose-100 text-rose-700 hover:bg-rose-200",
                        ].join(" ")}
                        aria-label={user.status === "Blocked" ? "Unblock user" : "Block user"}
                        title={user.status === "Blocked" ? "Unblock" : "Block"}
                      >
                        {user.status === "Blocked" ? (
                          <MdLockOpen className="h-4 w-4" />
                        ) : (
                          <MdBlock className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">
            Showing {totalUsers === 0 ? 0 : start + 1}-{Math.min(start + rowsPerPage, totalUsers)} of {totalUsers} users
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
            &lt;  Previous
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
            Next  &gt;
          </button>
        </div>
      </div>

      <ViewUserModal
        open={!!viewTarget}
        user={viewTarget}
        onClose={() => setViewTarget(null)}
      />

      <BlockUserModal
        open={!!blockTarget}
        user={blockTarget}
        isLoading={isBlockingUser}
        onCancel={() => {
          if (!isBlockingUser) setBlockTarget(null);
        }}
        onConfirm={handleBlockConfirm}
      />
    </div>
  );
}
