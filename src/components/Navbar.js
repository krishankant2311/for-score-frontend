"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FiMenu, FiX } from "react-icons/fi"; 
import Sidebar from "@/components/Sidebar";
import { createPortal } from "react-dom";

export default function Navbar() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isMounted, setIsMounted] = useState(false);

  const handleLogout = () => {
    // console.log("User logged out");
    localStorage.removeItem("token");
    setIsModalOpen(false);
    // window.location.href = "/login";
    router.replace("/login");
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen]);

  return (
    <>
      <header className="glass-header sticky top-0 z-30 w-full rounded-2xl border border-border/60 px-4 py-3">
        <nav className="flex items-center justify-between gap-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-2xl text-foreground/80 transition-colors hover:text-foreground sm:hidden"
            aria-label="Open Sidebar"
          >
            <FiMenu />
          </button>

          <div className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Welcome Admin
          </div>

          {/* Logout button */}
          <div className="flex items-center">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 text-sm sm:text-base"
            >
              Logout
            </Button>
          </div>
        </nav>
      </header>

      {/* === Slide-in Sidebar (mobile only) === */}
      {isSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 sm:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>

          {/* Sidebar content — height constrained so nav list scrolls */}
          <aside className="fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col overflow-hidden rounded-r-2xl border-r border-sidebar-border bg-sidebar shadow-[var(--shadow-premium)] transition-transform duration-300 sm:hidden">
            <div className="flex shrink-0 items-center justify-end border-b border-sidebar-border px-3 py-2">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-lg p-2 text-2xl text-white/90 hover:bg-white/10"
                aria-label="Close sidebar"
              >
                <FiX />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <Sidebar />
            </div>
          </aside>
        </>
      )}

      {/* ✅ Logout Confirmation Modal */}
      {isMounted && isModalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              onClick={() => setIsModalOpen(false)}
            >
              <div
                className="surface-card w-[90%] max-w-sm p-6 text-center shadow-[var(--shadow-premium)]"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  Are you sure you want to logout?
                </h2>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button onClick={handleLogout}>Yes, Logout</Button>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
