import { requireRole } from "@/lib/auth/requireRole";
import { AreaNav } from "@/components/area-nav";

const LINKS = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/dashboard/salon", label: "Salão" },
  { href: "/dashboard/staff", label: "Staff" },
  { href: "/dashboard/services", label: "Serviços" },
  { href: "/dashboard/schedule", label: "Horário" },
  { href: "/dashboard/appointments", label: "Agendamentos" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["owner"]);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AreaNav title="FindIt" subtitle={profile.full_name} badge="Dono" links={LINKS} />
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
