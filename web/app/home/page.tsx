import { redirect } from "next/navigation";
import { requireRole, HOME_FOR_ROLE } from "@/lib/auth/requireRole";

// Neutral "send me where I belong" entry point. Anything that knows someone
// is logged in but not which role they have (the proxy, a stale bookmark)
// points here rather than guessing /dashboard.
export default async function HomeRedirectPage() {
  const { profile } = await requireRole(["owner", "staff", "admin", "client"]);
  redirect(HOME_FOR_ROLE[profile.role]);
}
