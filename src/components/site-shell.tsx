"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <>
      {!isAdmin && <MobileHeader />}
      {!isAdmin && <Sidebar />}
      {!isAdmin && <MobileBottomNav />}
      <div className={`page-shell ${isAdmin ? "is-admin" : ""}`}>
        {children}
      </div>
    </>
  );
}
