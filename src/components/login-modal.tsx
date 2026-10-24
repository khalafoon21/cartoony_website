"use client";

import { forwardRef, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "./icon";

export const LoginModal = forwardRef<HTMLDialogElement>(function LoginModal(_, ref) {
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return <dialog ref={ref} className="login-dialog" aria-labelledby="login-title" aria-describedby="login-description" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }} onClose={() => { setSubmitted(false); formRef.current?.reset(); }}>
    <button className="icon-button dialog-close" aria-label="إغلاق نافذة تسجيل الدخول" onClick={(event) => event.currentTarget.closest("dialog")?.close()}><Icon name="close" /></button>
    <Image className="dialog-logo" src="/branding/cartoony-original.jpg" alt="شعار كارتوني الرسمي" width={88} height={88} />
    <span className="eyebrow">حكاياتنا أحلى بوجودك</span>
    <h2 id="login-title">أهلًا بك في كارتوني</h2>
    <p id="login-description">هذه معاينة لواجهة الدخول. تسجيل الدخول الحقيقي سيتوفر في مرحلة لاحقة.</p>
    <form ref={formRef} onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
      <label htmlFor="login-email">البريد الإلكتروني</label>
      <input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" dir="ltr" required />
      <label htmlFor="login-password">كلمة المرور</label>
      <input id="login-password" type="password" autoComplete="current-password" minLength={6} placeholder="٦ أحرف على الأقل" required />
      <button className="primary-button" type="submit">معاينة تسجيل الدخول <Icon name="arrow" size={19} /></button>
      {submitted && <p className="form-notice" role="status">أنت في النسخة التجريبية. لم تُرسل بياناتك أو تُحفظ.</p>}
    </form>
    <span className="dialog-footnote">عالم من الحكايات، لكل العائلة.</span>
  </dialog>;
});
