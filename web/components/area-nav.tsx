"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavLink = { href: string; label: string };

// Shared sidebar for every signed-in area (owner / staff / admin). The badge
// makes it obvious at a glance which area you're in — with several roles and
// two apps, "where am I logged in as what?" was easy to lose track of.
export function AreaNav({
  title,
  subtitle,
  badge,
  links,
}: {
  title: string;
  subtitle: string | null;
  badge: string;
  links: NavLink[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="flex w-60 flex-col border-r border-neutral-200 bg-white p-4">
      <div className="mb-6 px-2">
        <p className="text-lg font-bold">{title}</p>
        <span className="mt-1 inline-block rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
          {badge}
        </span>
        {subtitle ? <p className="mt-1 text-sm text-neutral-500">{subtitle}</p> : null}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {links.map((link) => {
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
