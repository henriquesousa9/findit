"use client";

import { useState } from "react";
import { useMyStaffMemberships } from "@/lib/hooks/useMyStaffMemberships";
import { useSalonAvailability } from "@/lib/hooks/useAvailability";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Read-only by design: working hours are set by the salon owner, and the
// database enforces that (only availability_write_salon_owner grants writes).
export default function StaffSchedulePage() {
  const { data: memberships, isLoading: loadingMemberships } = useMyStaffMemberships();

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const current = memberships?.find((m) => m.id === selectedId) ?? memberships?.[0];

  const { data: availability, isLoading: loadingAvailability } = useSalonAvailability(current?.salon_id, current?.id);

  if (loadingMemberships) return <p className="text-neutral-500">A carregar...</p>;

  if (!memberships || memberships.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-neutral-900">Horário</h1>
        <p className="text-neutral-500">
          Ainda não és staff de nenhum salão. Quando um dono te convidar, aceita o convite na app para começares.
        </p>
      </div>
    );
  }

  const sorted = [...(availability ?? [])].sort(
    (a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)
  );

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-neutral-900">O meu horário</h1>
      <p className="mb-6 text-sm text-neutral-500">
        As horas de trabalho são definidas pelo salão. Se precisares de as alterar, fala com o dono.
      </p>

      {memberships.length > 1 ? (
        <select
          value={current?.id ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mb-4 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-900"
        >
          {memberships.map((m) => (
            <option key={m.id} value={m.id}>
              {m.salon?.name ?? "Salão"}
            </option>
          ))}
        </select>
      ) : null}

      <div className="space-y-2">
        {loadingAvailability ? <p className="text-neutral-500">A carregar...</p> : null}
        {sorted.map((a) => (
          <div key={a.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="font-medium text-neutral-900">
              {WEEKDAYS[a.weekday]} · {a.start_time.slice(0, 5)} - {a.end_time.slice(0, 5)}
            </p>
          </div>
        ))}
        {!loadingAvailability && sorted.length === 0 ? (
          <p className="text-neutral-500">O salão ainda não te definiu horário.</p>
        ) : null}
      </div>
    </div>
  );
}
