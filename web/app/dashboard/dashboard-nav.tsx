"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

const LINKS = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/dashboard/salon", label: "Salão" },
  { href: "/dashboard/staff", label: "Staff" },
  { href: "/dashboard/services", label: "Serviços" },
  { href: "/dashboard/schedule", label: "Horário" },
  { href: "/dashboard/appointments", label: "Agendamentos" },
];

export function DashboardNav({ fullName }: { fullName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="flex w-60 flex-col border-r border-neutral-200 bg-white p-4">
      <div className="mb-6 px-2">
        <p className="text-lg font-bold">FindIt</p>
        {fullName ? <p className="text-sm text-neutral-500">{fullName}</p> : null}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <button
        onClick={handleSignOut}
        className="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Sair
      </button>
    </nav>
  );
}
