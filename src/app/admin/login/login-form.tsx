"use client";

import { useActionState, useState } from "react";
import { loginAdminAction, type AdminLoginState } from "../actions";
import { Icon } from "@/components/icon";

const initialState: AdminLoginState = {
  error: null,
};

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(loginAdminAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="admin-login-form" noValidate>
      {state.error && (
        <div className="admin-alert" role="alert" aria-live="polite">
          <span>{state.error}</span>
        </div>
      )}

      <div className="admin-field">
        <label htmlFor="admin-email">البريد الإلكتروني للإدارة</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          dir="ltr"
          placeholder="admin@cartoony.local"
          required
        />
      </div>

      <div className="admin-field">
        <div className="admin-label-row">
          <label htmlFor="admin-password">كلمة المرور</label>
          <button
            type="button"
            className="admin-password-toggle"
            aria-pressed={showPassword}
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? "إخفاء" : "إظهار"}
          </button>
        </div>
        <input
          id="admin-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          dir="ltr"
          placeholder="••••••••••••"
          required
        />
      </div>

      <button
        type="submit"
        className="primary-button admin-submit-btn"
        disabled={isPending}
      >
        <span>{isPending ? "جاري التحقق..." : "تسجيل دخول المشرف"}</span>
        <Icon name="arrow" size={18} />
      </button>
    </form>
  );
}
