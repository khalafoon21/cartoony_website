import { NextResponse, type NextRequest } from "next/server";

const PROD_COOKIE = "__Host-cartoony_admin_session";
const DEV_COOKIE = "cartoony_admin_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(PROD_COOKIE)?.value ||
    request.cookies.get(DEV_COOKIE)?.value;

  const isLoginRoute = pathname === "/admin/login";

  if (!isLoginRoute && !token) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
