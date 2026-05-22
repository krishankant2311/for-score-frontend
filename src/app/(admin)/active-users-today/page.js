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
import { FaRegEye } from "react-icons/fa";
import ViewActiveUserModal from "./components/ViewActiveUserModal";
import { toast } from "react-hot-toast";
import AdminHeaderCard from "@/components/admin/AdminHeaderCard";

const DEFAULT_ROWS_PER_PAGE = 6;

function mapApiUserToRow(u) {
  const lastActive =
    u?.lastWorkout ??
    (u?.updatedAt ? new Date(u.updatedAt).toLocaleString("en-IN") : "") ??
    "";

  return {
    id: u?._id ?? u?.id,
    name: u?.name ?? "",
    email: u?.email ?? "",
    goal: u?.fitnessTarget ?? u?.goalDuration ?? "",
    lastActiveAt: lastActive || "-",
    sessionsToday: typeof u?.sessionsToday === "number" ? u.sessionsToday : "-",
  };
}

export default function ActiveUsersToday() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);

  const handleView = (id) => {
    const user = activeUsers.find((u) => u.id === id);
    setViewTarget(user || null);
  };

  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return activeUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.goal && u.goal.toLowerCase().includes(q))
    );
  }, [searchTerm, activeUsers]);

  const totalUsers = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(start, start + rowsPerPage);

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

  const todayFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, []);

  useEffect(() => {
    const fetchActiveUsers = async () => {
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
        const res = await axios.get(`${baseUrl}/api/admin/get-all-active-users`, {
          headers: { token },
        });

        const raw = res?.data?.result;
        const list = Array.isArray(raw) ? raw : [];
        setActiveUsers(list.map(mapApiUserToRow));
      } catch (err) {
        console.error("Fetch active users failed:", err?.response?.data || err?.message);
        toast.error(err?.response?.data?.message || "Failed to fetch active users");
      } finally {
        setIsFetching(false);
      }
    };

    fetchActiveUsers();
  }, []);

  return (
    <div className="min-h-[80vh] py-8 px-1">
      <AdminHeaderCard
        title="Active Users Today"
        subtitle="Users with activity recorded today."
        stats={
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{todayFormatted}</span>
            <span className="mx-2 text-muted-foreground/60">|</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              {totalUsers} users active today
            </span>
          </p>
        }
      />

      <div className="p-4 mt-6 bg-white rounded-lg border border-[#C8D7E9] shadow-md">
        <Input
          placeholder="Search by name, email, or goal..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full border-[#C8D7E9] rounded-md"
        />
      </div>

      <div className="mt-6 w-full overflow-x-auto border border-[#C8D7E9] rounded-lg shadow-md max-h-[500px] overflow-y-auto">
        <Table className="min-w-[1200px]">
          <TableHeader className="sticky top-0 z-10 bg-[#F2F5FA]">
            <TableRow className="border-b bg-[#F2F5FA]">
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">NAME</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">EMAIL</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">GOAL</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">LAST ACTIVE</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">SESSIONS TODAY</TableHead>
              <TableHead className="font-semibold text-[#2158A3] px-4 py-3">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  Loading active users...
                </TableCell>
              </TableRow>
            ) : paginatedUsers.length > 0 ? (
              paginatedUsers.map((user, idx) => (
                <TableRow key={user.id} className={idx % 2 === 1 ? "bg-gray-50/50" : ""}>
                  <TableCell className="px-4 py-3 font-medium text-[#0A3161]">{user.name}</TableCell>
                  <TableCell className="px-4 py-3 text-[#2158A3] font-normal text-sm">
                    {user.email}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-[#0A3161]">
                      {user.goal}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-[#2158A3] font-normal text-sm">
                    {user.lastActiveAt}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-medium">
                      {user.sessionsToday}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleView(user.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                      aria-label="View user"
                    >
                      <FaRegEye className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  No active users found for today
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg border border-[#C8D7E9] shadow-md px-4 py-4">
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
        <p className="text-sm text-gray-600">
          Showing {totalUsers === 0 ? 0 : start + 1}-{Math.min(start + rowsPerPage, totalUsers)} of{" "}
          {totalUsers} users
        </p>
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

      <ViewActiveUserModal
        open={!!viewTarget}
        user={viewTarget}
        onClose={() => setViewTarget(null)}
      />
    </div>
  );
}
