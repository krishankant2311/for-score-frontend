"use client";

import { buildPaginationItems } from "@/lib/formValidation";

export default function AdminPagination({
  currentPage,
  totalPages,
  rowsPerPage,
  totalItems,
  onPageChange,
  onRowsPerPageChange,
  rowOptions = [6, 10, 25, 50],
}) {
  const displayLo = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const displayHi = totalItems === 0 ? 0 : Math.min(currentPage * rowsPerPage, totalItems);
  const paginationItems = buildPaginationItems(currentPage, totalPages);

  const goToPage = (p) => onPageChange(Math.max(1, Math.min(p, totalPages)));

  if (totalItems === 0) return null;

  return (
    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg border border-[#C8D7E9] shadow-md px-4 py-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Rows per page:</span>
        <select
          className="border border-[#C8D7E9] rounded-md px-2 py-1 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0A3161]/30"
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
        >
          {rowOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-600">
        Showing {displayLo}-{displayHi} of {totalItems} items
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
  );
}
