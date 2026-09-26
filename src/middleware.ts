import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const role = user?.role;

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "ADMIN") {
      const dest = role === "ORGANIZER" ? "/dashboard" : "/my";
      return NextResponse.redirect(new URL(dest, req.url));
    }
  }

  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "ORGANIZER") {
      const dest = role === "ADMIN" ? "/admin" : "/my";
      return NextResponse.redirect(new URL(dest, req.url));
    }
  }

  if (pathname.startsWith("/my")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/my/:path*"],
};
