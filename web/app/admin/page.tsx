"use client";

import { useAllSalonsAdmin } from "@/lib/hooks/useAdminSalons";

export default function AdminSalonsPage() {
  const { data: salons, isLoading, error } = useAllSalonsAdmin();

  if (isLoading) return <p className="text-neutral-500">A carregar...</p>;
  if (error) return <p className="text-red-600">Erro a carregar salões.</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold">Salões</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Todos os salões da plataforma. A edição detalhada de cada salão (serviços, horários, staff) está no painel
        admin da app.
      </p>

      <div className="space-y-2">
        {salons?.map((s) => (
          <div key={s.id} className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4">
            {s.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-lg bg-neutral-100" />
            )}
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-neutral-500">
                {s.city}
                {s.address ? ` · ${s.address}` : ""}
              </p>
              <p className="text-xs text-neutral-400">Dono: {s.owner?.full_name ?? "—"}</p>
            </div>
          </div>
        ))}
        {salons?.length === 0 ? <p className="text-neutral-500">Ainda não existem salões.</p> : null}
      </div>
    </div>
  );
}
