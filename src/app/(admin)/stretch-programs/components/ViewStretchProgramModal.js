"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FaRegEye,
  FaRegHeart,
  FaTag,
  FaClock,
  FaSignal,
  FaCheckCircle,
  FaCalendarAlt,
} from "react-icons/fa";

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ViewStretchProgramModal({ open, program, onClose }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !program || !isMounted) return null;

  const movements = Array.isArray(program.movements) ? program.movements : [];
  const intro = program.intro || program.description || "";

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#0A3161] to-[#0D3D7A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
              <FaRegEye className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">View Stretch Program</h2>
              <p className="mt-0.5 text-xs text-white/80">Full program details and movement sequence</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="rounded-xl border border-[#C8D7E9] bg-gradient-to-br from-[#F2F5FA] to-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0A3161]/10 text-[#0A3161]">
                <FaRegHeart className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#5671A6]">
                  Program Title
                </label>
                <p className="mt-2 break-words text-lg font-semibold text-[#0A3161]">{program.title}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#C8D7E9] bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <FaTag className="h-4 w-4 text-[#0A3161]" />
                <label className="text-xs font-semibold uppercase tracking-wide text-[#5671A6]">
                  Category
                </label>
              </div>
              <p className="text-sm font-medium text-[#0A3161]">{program.category || "Recover"}</p>
            </div>

            <div className="rounded-xl border border-[#C8D7E9] bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <FaClock className="h-4 w-4 text-[#0A3161]" />
                <label className="text-xs font-semibold uppercase tracking-wide text-[#5671A6]">
                  Duration
                </label>
              </div>
              <p className="text-sm font-medium text-[#0A3161]">{program.durationMinutes} min</p>
            </div>

            <div className="rounded-xl border border-[#C8D7E9] bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <FaSignal className="h-4 w-4 text-[#0A3161]" />
                <label className="text-xs font-semibold uppercase tracking-wide text-[#5671A6]">
                  Level
                </label>
              </div>
              <p className="text-sm font-medium text-[#0A3161]">{program.level || "All Levels"}</p>
            </div>

            <div className="rounded-xl border border-[#C8D7E9] bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <FaCheckCircle className="h-4 w-4 text-[#0A3161]" />
                <label className="text-xs font-semibold uppercase tracking-wide text-[#5671A6]">
                  Status
                </label>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  program.status === "Active"
                    ? "bg-green-100 text-green-800"
                    : program.status === "Draft"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {program.status || "Active"}
              </span>
            </div>
          </div>

          {intro ? (
            <div className="rounded-xl border border-[#C8D7E9] bg-white p-4 shadow-sm">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#5671A6]">
                Intro / Instructions
              </label>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#0A3161]">{intro}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-[#C8D7E9] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#C8D7E9] bg-[#F2F5FA] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0A3161]">
                Movement Sequence ({movements.length})
              </h3>
            </div>
            {movements.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No movements added.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 py-2 text-[#2158A3]">#</TableHead>
                      <TableHead className="px-4 py-2 text-[#2158A3]">SEQUENCE</TableHead>
                      <TableHead className="px-4 py-2 text-[#2158A3]">MOVEMENT</TableHead>
                      <TableHead className="px-4 py-2 text-[#2158A3]">TARGET AREA</TableHead>
                      <TableHead className="px-4 py-2 text-[#2158A3]">TIME</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m, idx) => (
                      <TableRow key={`${m.sequenceOrder ?? idx}-${m.movementName}`}>
                        <TableCell className="px-4 py-3 align-top">{m.sequenceOrder ?? idx + 1}</TableCell>
                        <TableCell className="px-4 py-3 align-top whitespace-normal">
                          {m.sequenceLabel || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 align-top whitespace-normal font-medium text-[#0A3161]">
                          {m.movementName || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 align-top whitespace-normal text-[#5671A6]">
                          {m.targetArea || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 align-top whitespace-normal">
                          {m.timeLabel || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#C8D7E9] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <FaCalendarAlt className="h-4 w-4 text-[#5671A6]" />
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#5671A6]">
                    Created At
                  </label>
                  <p className="mt-1 text-sm font-medium text-[#0A3161]">
                    {formatDateTime(program.createdAt)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[#C8D7E9] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <FaCalendarAlt className="h-4 w-4 text-[#5671A6]" />
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#5671A6]">
                    Updated At
                  </label>
                  <p className="mt-1 text-sm font-medium text-[#0A3161]">
                    {formatDateTime(program.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#C8D7E9] bg-gray-50 px-6 py-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#C8D7E9] px-6 font-medium text-[#0A3161]"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
