import { NextRequest, NextResponse } from "next/server";

// Mbrojtje e trashë në skaj: pa cookie sesioni → /login.
// Verifikimi i vërtetë (DB) bëhet në faqe/actions me sitzungErforderlich().
const OEFFENTLICH = ["/login", "/registrieren"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    OEFFENTLICH.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }
  if (!req.cookies.get("sitzung")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
