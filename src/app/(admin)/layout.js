"use client";

// AdminLayout.jsx
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import ScrollToTopOnRouteChange from "@/components/ScrollToTopOnRouteChange";

// export default function AdminLayout({ children }) {
//   return (
//     <div className="flex">
//       {/* ===== Fixed Sidebar ===== */}
//       <aside className="hidden sm:block fixed top-0 left-0 h-screen w-64 bg-white shadow-md z-50">
//         <Sidebar />
//       </aside>

//       {/* ===== Right side: Fixed Navbar + Scrollable main ===== */}
//       <div className="flex flex-col flex-1 sm:ml-64">
//         {/* Fixed Navbar */}
//         <header className="fixed top-0 left-0 sm:left-64 right-0 h-16 bg-white border-b shadow z-40">
//           <Navbar />
//         </header>

//         {/* Scrollable main content area */}
//         <main className="pt-16 p-4 min-h-screen overflow-auto bg-gray-50">
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }


export default function AdminLayout({ children }) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setIsCheckingAuth(false);
  }, [router]);

  if (isCheckingAuth) return null;

  return (
    <div className="admin-shell text-foreground">
      <ScrollToTopOnRouteChange />
      {/* Sidebar */}
      <aside className="hidden sm:block fixed top-0 left-0 z-50 h-screen w-64 overflow-hidden rounded-r-2xl border-r border-sidebar-border bg-sidebar shadow-[var(--shadow-premium)]">
        <Sidebar />
      </aside>

      {/* Main area: sticky header avoids content sliding under a fixed bar (overlap / “ghost” title) */}
      <div className="sm:ml-64">
        <div className="sticky top-0 z-40  px-3 pb-2 pt-3 backdrop-blur-md sm:px-4 sm:pb-3 sm:pt-4">
          <Navbar />
        </div>

        <main className="min-h-screen px-4 pb-8 sm:px-6 sm:pb-10">{children}</main>
      </div>
    </div>
  );
}