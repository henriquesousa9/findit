import { requireRole } from "@/lib/auth/requireRole";
import { AreaNav } from "@/components/area-nav";

const LINKS = [
  { href: "/staff", label: "Horário" },
  { href: "/staff/appointments", label: "Agendamentos" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["staff"]);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AreaNav title="FindIt" subtitle={profile.full_name} badge="Staff" links={LINKS} />
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
