"use client";
import { useState, useMemo } from "react";
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
import { MdOutlineDeleteOutline } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import { FiEdit } from "react-icons/fi";

export default function User() {
  // ✅ Dummy data
  const invoices = [
    {
      srNo: 1,
      fullName: "Rahul Sharma",
      email: "rahul.sharma@example.com",
      number: "+91 9876543210",
      patientName: "Ankit Sharma",
      status: "Paid",
      date: "2025-09-15",
    },
    {
      srNo: 2,
      fullName: "Priya Verma",
      email: "priya.verma@example.com",
      number: "+91 9123456780",
      patientName: "Rohit Verma",
      status: "Pending",
      date: "2025-09-14",
    },
    {
      srNo: 3,
      fullName: "Amit Singh",
      email: "amit.singh@example.com",
      number: "+91 9988776655",
      patientName: "Neha Singh",
      status: "Failed",
      date: "2025-09-13",
    },
    {
      srNo: 4,
      fullName: "Sneha Kapoor",
      email: "sneha.kapoor@example.com",
      number: "+91 9090909090",
      patientName: "Karan Kapoor",
      status: "Paid",
      date: "2025-09-12",
    },
    {
      srNo: 5,
      fullName: "Vikas Mehta",
      email: "vikas.mehta@example.com",
      number: "+91 9811111111",
      patientName: "Riya Mehta",
      status: "Pending",
      date: "2025-09-11",
    },
    {
      srNo: 6,
      fullName: "Anjali Desai",
      email: "anjali.desai@example.com",
      number: "+91 9876501234",
      patientName: "Aarav Desai",
      status: "Paid",
      date: "2025-09-10",
    },
  ];

  // 🔍 Search
  const [searchTerm, setSearchTerm] = useState("");

  // 🔢 Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // ✅ Filter + paginate
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) =>
      `${inv.id} ${inv.status} ${inv.method}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Handler helpers
  const goToPage = (p) => setCurrentPage(p);
  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  return (
    <div className="my-10 min-h-[80vh] space-y-6">
      {/* Header with Title + dropdown + search */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Total Guardians</h1>

        <div className="flex items-center gap-3">
          {/* Example filter dropdown */}
          <select className="border rounded px-2 py-1 text-sm">
            <option value="">All</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>

          <Input
            placeholder="Search by invoice, status, or method..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-sm"
          />
        </div>
      </div>

      <div className=" w-full overflow-x-auto ">
        <Table className="min-w-[900px] table-auto">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Sr No.</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Patients Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInvoices.length > 0 ? (
              paginatedInvoices.map((inv) => (
                <TableRow key={inv.srNo}>
                  <TableCell className="font-medium">{inv.srNo}</TableCell>
                  <TableCell>{inv.fullName}</TableCell>
                  <TableCell>{inv.email}</TableCell>
                  <TableCell>{inv.number}</TableCell>
                  <TableCell>{inv.patientName}</TableCell>
                  <TableCell>{inv.status}</TableCell>

                  {/* 👉 Action buttons */}
                  <TableCell>
                    <div className="flex gap-6 ">
                      <button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => console.log("View", inv.srNo)}
                      >
                        <FiEdit />
                      </button>
                      <button
                        variant="default"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => console.log("Edit", inv.srNo)}
                      >
                        <FaRegEye />
                      </button>
                      <button
                        variant="destructive"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => console.log("Delete", inv.srNo)}
                      >
                        <MdOutlineDeleteOutline />
                        {/* Delete */}
                      </button>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">{inv.date}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500">
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        {/* Rows per page */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Rows per page:</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Page numbers */}
        <div className="flex items-center gap-1 text-sm ">
          <Button
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={currentPage === 1}
          >
            &lt;
          </Button>

          {[...Array(totalPages)].map((_, index) => {
            const page = index + 1;
            // show first, last, and neighbors
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                >
                  {page}
                </Button>
              );
            }
            if (page === currentPage - 2 || page === currentPage + 2) {
              return <span key={page}>…</span>;
            }
            return null;
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={currentPage === totalPages}
          >
            &gt;
          </Button>
        </div>
      </div>
    </div>
  );
}
