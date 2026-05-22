"use client";

import { FaRegCommentDots, FaRegFileAlt, FaRegHeart, FaSignOutAlt } from "react-icons/fa";
import { MdDashboard, MdFitnessCenter } from "react-icons/md";
import { TbActivityHeartbeat } from "react-icons/tb";
import { LiaDumbbellSolid } from "react-icons/lia";
import { LuUsers, LuApple } from "react-icons/lu";
import { TbChartPie } from "react-icons/tb";
import { BiBell, BiComment } from "react-icons/bi";
import { HiOutlineCog, HiOutlineCreditCard } from "react-icons/hi";
import { PiLayoutLight } from "react-icons/pi";
import { HiOutlineClipboardList } from "react-icons/hi";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
    } catch {
      // ignore
    }
    router.replace("/login");
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isLogoutOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsLogoutOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLogoutOpen]);

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: MdDashboard },
    { href: "/users", label: "User", icon: LuUsers },
    // {
    //   href: "/exercise-library",
    //   label: "Exercise Library",
    //   icon: LiaDumbbellSolid,
    // },
   
    // {
    //   href: "/recovery-content",
    //   label: "Recovery Content",
    //   icon: FaRegHeart,
    // },
    {
      href: "/fitness-programs",
      label: "Fitness Programs",
      icon: MdFitnessCenter,
    },
    { href: "/foods", label: "Foods", icon: LuApple },
    { href: "/nutrition-cheat-sheet", label: "Nutrition Cheat Sheet", icon: TbChartPie },
    {
      href: "/notification",
      label: "Notifications",
      icon: BiBell,
    },
    {
      href: "/feedback",
      label: "Feedback",
      icon: FaRegCommentDots,
    },
    {
      href: "/faq",
      label: "FAQ",
      icon: BiComment,
    },
    {
      href: "/subscription",
      label: "Subscription",
      icon: HiOutlineCreditCard,
    },
    // {
    //   href: "/onboarding",
    //   label: "Onboarding",
    //   icon: HiOutlineClipboardList,
    // },
    // { 
    //   href: "/unity-community", 
    //   label: "Unity (Community)", 
    //   icon: BiComment 
    // },
    { 
      href: "/active-users-today", 
      label: "Active Users Today", 
      icon: TbActivityHeartbeat 
    },
    { 
      href: "/content-management", 
      label: "Content Management", 
      icon: FaRegFileAlt 
    },
    // {
    //   href: "/wireframe",
    //   label: "Wireframe",
    //   icon: PiLayoutLight,
    // },
    {
      href: "/settings",
      label: "Settings",
      icon: HiOutlineCog,
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-sidebar bg-gradient-to-b from-sidebar via-sidebar to-[oklch(0.22_0.09_255)] text-sidebar-foreground">
      {/* Logo */}
      <div className="flex shrink-0 flex-col items-center gap-2 border-b border-sidebar-border/80 px-4 py-1 pt-4 text-center">
        <Image
          src="/logo.png"
          alt="Medi Admin Logo"
          width={150}
          height={60}
          className="h-20 w-auto rounded-2xl object-contain p-1 "
        />
        <div>
          <h1 className="text-lg font-bold tracking-tight">4 Score Fitness</h1>
          {/* <p className="text-xs font-medium text-sidebar-foreground/60">Admin Panel</p> */}
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain p-3 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.35)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/45">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 ${
                active
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-sidebar-primary/35"
                  : "text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0 opacity-95" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border/80 p-3">
        <button
          type="button"
          onClick={() => setIsLogoutOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
        >
          <FaSignOutAlt className="h-5 w-5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>

      <SidebarLogoutModal
        open={isLogoutOpen}
        isMounted={isMounted}
        onCancel={() => setIsLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}

/* Sidebar logout confirmation (portal to body to avoid z-index/stacking issues) */
function SidebarLogoutModal({ open, onCancel, onConfirm, isMounted }) {
  if (!isMounted || !open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="surface-card w-[90%] max-w-sm p-6 text-center shadow-[var(--shadow-premium)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Are you sure you want to logout?
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-all duration-200 hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
          >
            Yes, Logout
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 border-primary/25 bg-background/80 px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
