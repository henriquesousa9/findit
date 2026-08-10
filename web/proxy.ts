import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed Middleware to Proxy (same runtime/API). This refreshes
// the Supabase session cookie on every request and does an *optimistic*
// redirect for unauthenticated/authenticated users — RLS is still the real
// authorization boundary, this only avoids flashing protected UI.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const PROTECTED = ["/dashboard", "/staff", "/admin", "/app-only", "/home"];
  const isProtected = PROTECTED.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Deliberately /home and not /dashboard: the proxy only knows *that*
  // someone is signed in, not their role, and reading the profile here would
  // mean a database round-trip on every single request.
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
