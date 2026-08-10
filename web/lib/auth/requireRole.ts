// Server-only: imports next/headers via the supabase server client. Client
// components must import the role map from ./roles instead — pulling it in
// from here drags server code into the browser bundle and fails the build.
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { HOME_FOR_ROLE, type Role } from "./roles";

export { HOME_FOR_ROLE, type Role };

// Server-side gate for an area. RLS is still the real protection on the data
// itself; this just keeps people out of UI that isn't theirs, and — unlike a
// bare redirect — always sends them somewhere that explains itself.
export async function requireRole(allowed: Role[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  const role = profile?.role as Role | undefined;

  if (!role) redirect("/login?error=no-profile");
  if (!allowed.includes(role)) redirect(HOME_FOR_ROLE[role]);

  return { user, profile: profile as { id: string; role: Role; full_name: string | null } };
}
