"use server";

import { redirect } from "next/navigation";
import {
  checkLoginRateLimit,
  clearAdminSessionCookie,
  createSessionToken,
  getClientIdentifier,
  isAdminProvisioned,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export type AdminLoginState = {
  error: string | null;
};

const GENERIC_AUTH_ERROR = "بيانات الدخول غير صحيحة. يرجى التحقق والمحاولة مرة أخرى.";
const RATE_LIMIT_ERROR =
  "تم تجاوز الحد المسموح لمحاولات الدخول. يرجى الانتظار قليلًا ثم المحاولة مجددًا.";

export async function loginAdminAction(
  _prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const clientId = await getClientIdentifier();
  const rateLimit = await checkLoginRateLimit(clientId);

  if (!rateLimit.allowed) {
    return { error: RATE_LIMIT_ERROR };
  }

  if (!isAdminProvisioned()) {
    return { error: GENERIC_AUTH_ERROR };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password || email.length > 254 || password.length > 256) {
    return { error: GENERIC_AUTH_ERROR };
  }

  const isValid = verifyAdminCredentials(email, password);
  if (!isValid) {
    return { error: GENERIC_AUTH_ERROR };
  }

  const token = await createSessionToken(email);
  if (!token) {
    return { error: GENERIC_AUTH_ERROR };
  }

  await setAdminSessionCookie(token);
  redirect("/admin");
}

export async function logoutAdminAction(): Promise<void> {
  await clearAdminSessionCookie();
  redirect("/admin/login");
}
