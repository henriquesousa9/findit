// Deliberately free of server-only imports (no next/headers, no supabase
// server client) so client components can import the role map too — the
// login form needs it to route after signing in.
export type Role = "client" | "owner" | "staff" | "admin";

// Where each role lands after logging in. Single source of truth, read by
// the login form and by every area gate.
export const HOME_FOR_ROLE: Record<Role, string> = {
  owner: "/dashboard",
  staff: "/staff",
  admin: "/admin",
  client: "/app-only",
};
