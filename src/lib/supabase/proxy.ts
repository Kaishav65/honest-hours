import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PAGES = ["/login", "/signup"];

// Refreshes the session cookie, then applies the logged-in / logged-out redirects.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Don't put code between createServerClient and getClaims (it refreshes the session).
  const { data } = await supabase.auth.getClaims();
  const loggedIn = !!data?.claims;
  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!loggedIn && !isAuthPage) return redirectTo(request, "/login", response);
  if (loggedIn && isAuthPage) return redirectTo(request, "/today", response);
  return response;
}

// Keep the refreshed cookies on the redirect response.
function redirectTo(request: NextRequest, path: string, from: NextResponse) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
