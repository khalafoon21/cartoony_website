import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { getAdminSession } from "@/lib/admin-auth";
import { adminNavSections } from "@/lib/admin-data";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-workspace">
      <AdminSidebar adminEmail={session.email} navSections={adminNavSections} />
      <div className="admin-workspace-main">{children}</div>
    </div>
  );
}
