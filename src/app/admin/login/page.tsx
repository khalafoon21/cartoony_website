import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminLoginForm } from "./login-form";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  return (
    <main id="main-content" className="site-main admin-auth-shell" tabIndex={-1}>
      <section className="admin-auth-card" aria-labelledby="admin-login-heading">
        <div className="dialog-logo-stage">
          <span className="dialog-logo-glow" aria-hidden="true" />
          <Image
            className="dialog-brand-logo"
            src="/branding/cartoony-logo.png"
            alt="شعار كارتوني الرسمي"
            width={148}
            height={92}
            priority
          />
        </div>

        <span className="eyebrow">بوابة الإدارة المحمية</span>
        <h1 id="admin-login-heading">دخول مشرف كارتوني</h1>
        <p className="admin-auth-subtitle">
          هذه المنطقة مخصّصة لإدارة المنصة فقط. التصفح العام متاح لجميع الزوار دون الحاجة لحساب.
        </p>

        <AdminLoginForm />

        <div className="admin-auth-footer">
          <Link href="/" className="text-button">
            <span>العودة إلى واجهة كارتوني</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
