import { requireRole } from "@/lib/auth/requireRole";
import { AreaNav } from "@/components/area-nav";

const LINKS = [{ href: "/admin", label: "Salões" }];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["admin"]);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AreaNav title="FindIt" subtitle={profile.full_name} badge="Admin" links={LINKS} />
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
