"use client";

import { useMemo, useState } from "react";
import { useMyStaffMemberships } from "@/lib/hooks/useMyStaffMemberships";
import { useSalonAllAvailability } from "@/lib/hooks/useAvailability";
import { useSalonDayAppointments, useUpdateAppointmentStatus, type DayAppointment } from "@/lib/hooks/useAppointments";
import { DaySchedule, DayNavigator } from "@/components/day-schedule";
import { errorMessage } from "@/lib/errorMessage";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

export default function StaffAppointmentsPage() {
  const { data: memberships, isLoading: loadingMemberships } = useMyStaffMemberships();

  const [selectedSalonId, setSelectedSalonId] = useState<string | undefined>(undefined);
  const current = memberships?.find((m) => m.salon_id === selectedSalonId) ?? memberships?.[0];

  const [day, setDay] = useState(() => new Date());
  const { data: allAppointments, isLoading } = useSalonDayAppointments(current?.salon_id, day);
  const { data: availability } = useSalonAllAvailability(current?.salon_id);

  const updateStatus = useUpdateAppointmentStatus(current?.salon_id ?? "");
  const [selected, setSelected] = useState<DayAppointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only this staff member's own column and bookings.
  const appointments = useMemo(
    () => (allAppointments ?? []).filter((a) => a.staff_id === current?.id),
    [allAppointments, current?.id]
  );
  const columns = useMemo(
    () => (current ? [{ id: current.id, label: current.salon?.name ?? "As minhas marcações" }] : []),
    [current]
  );

  function handleChange(status: "confirmed" | "cancelled" | "completed") {
    if (!selected) return;
    setError(null);
    updateStatus.mutate(
      { appointmentId: selected.id, status },
      { onSuccess: () => setSelected(null), onError: (err) => setError(errorMessage(err)) }
    );
  }

  if (loadingMemberships) return <p className="text-neutral-500">A carregar...</p>;

  if (!memberships || memberships.length === 0) {
    return (
      <div className="max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-neutral-900">Agenda</h1>
        <p className="text-neutral-500">Ainda não és staff de nenhum salão.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">A minha agenda</h1>

      {memberships.length > 1 ? (
        <select
          value={current?.salon_id ?? ""}
          onChange={(e) => setSelectedSalonId(e.target.value)}
          className="mb-4 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-900"
        >
          {memberships.map((m) => (
            <option key={m.id} value={m.salon_id}>
              {m.salon?.name ?? "Salão"}
            </option>
          ))}
        </select>
      ) : null}

      <DayNavigator day={day} onChange={setDay} />

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {isLoading ? (
        <p className="text-neutral-500">A carregar...</p>
      ) : (
        <DaySchedule
          day={day}
          columns={columns}
          appointments={appointments}
          availability={availability ?? []}
          onSelect={setSelected}
          selectedId={selected?.id ?? null}
        />
      )}

      {selected ? (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4">
          <div>
            <p className="font-medium text-neutral-900">{selected.services?.name ?? "Serviço"}</p>
            <p className="text-sm text-neutral-500">
              {new Date(selected.starts_at).toLocaleString("pt-PT", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {STATUS_LABEL[selected.status]}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {selected.status === "pending" ? (
              <button onClick={() => handleChange("confirmed")} className="text-sm font-medium text-blue-600 hover:underline">
                Confirmar
              </button>
            ) : null}
            {selected.status === "confirmed" ? (
              <button onClick={() => handleChange("completed")} className="text-sm font-medium text-blue-600 hover:underline">
                Concluir
              </button>
            ) : null}
            {selected.status === "pending" || selected.status === "confirmed" ? (
              <button onClick={() => handleChange("cancelled")} className="text-sm font-medium text-red-600 hover:underline">
                Cancelar
              </button>
            ) : null}
            <button onClick={() => setSelected(null)} className="text-sm font-medium text-neutral-500 hover:underline">
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-neutral-500">Clica numa marcação para a confirmar, concluir ou cancelar.</p>
      )}
    </div>
  );
}
