import { type NextRequest, NextResponse } from "next/server";

/**
 * One codebase, two websites. Requests to the POS domain (a host starting with "pos.", e.g.
 * pos.alburhanregional.com or pos.localhost:3000) see only the till: "/" shows it, sign-in and the
 * API pass through, and ERP pages send the cashier back to the till.
 */
const POS_PATHS = ["/till", "/login", "/api/"];

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (!host.startsWith("pos.")) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/till", request.url));
  }
  if (POS_PATHS.some((path) => pathname === path || pathname.startsWith(path.endsWith("/") ? path : `${path}/`))) {
    return NextResponse.next();
  }
  // Any ERP page (including /overview after signing in) lands on the till.
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|flags/|auth/|.*\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
