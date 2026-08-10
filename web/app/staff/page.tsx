"use client";

import { useState } from "react";
import { useMyStaffMemberships } from "@/lib/hooks/useMyStaffMemberships";
import { useSalonAvailability, useCreateAvailability, useDeleteAvailability } from "@/lib/hooks/useAvailability";
import { errorMessage } from "@/lib/errorMessage";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function StaffSchedulePage() {
  const { data: memberships, isLoading: loadingMemberships } = useMyStaffMemberships();

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const current = memberships?.find((m) => m.id === selectedId) ?? memberships?.[0];

  const { data: availability, isLoading: loadingAvailability } = useSalonAvailability(current?.salon_id, current?.id);
  const createAvailability = useCreateAvailability(current?.salon_id ?? "", current?.id ?? "");
  const deleteAvailability = useDeleteAvailability(current?.salon_id ?? "", current?.id ?? "");

  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(startTime) || !timePattern.test(endTime) || startTime >= endTime) {
      setError("Usa o formato HH:MM e garante que a hora de início é antes da de fim.");
      return;
    }
    setError(null);
    try {
      await createAvailability.mutateAsync({ weekday, startTime: `${startTime}:00`, endTime: `${endTime}:00` });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loadingMemberships) return <p className="text-neutral-500">A carregar...</p>;

  if (!memberships || memberships.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">Horário</h1>
        <p className="text-neutral-500">
          Ainda não és staff de nenhum salão. Quando um dono te convidar, aceita o convite na app para começares.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">O meu horário</h1>

      <form
        onSubmit={handleAdd}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4"
      >
        {memberships.length > 1 ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">Salão</label>
            <select
              value={current?.id ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            >
              {memberships.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.salon?.name ?? "Salão"}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Dia</label>
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Início</label>
          <input
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            placeholder="09:00"
            className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Fim</label>
          <input
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            placeholder="18:00"
            className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
        <button
          type="submit"
          disabled={createAvailability.isPending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <div className="space-y-2">
        {loadingAvailability ? <p className="text-neutral-500">A carregar...</p> : null}
        {availability?.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
            <p className="font-medium">
              {WEEKDAYS[a.weekday]} · {a.start_time.slice(0, 5)} - {a.end_time.slice(0, 5)}
            </p>
            <button
              onClick={() => deleteAvailability.mutate(a.id)}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Remover
            </button>
          </div>
        ))}
        {!loadingAvailability && availability?.length === 0 ? (
          <p className="text-neutral-500">Sem horário definido ainda.</p>
        ) : null}
      </div>
    </div>
  );
}
