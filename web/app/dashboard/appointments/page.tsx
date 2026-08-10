"use client";

import { useMemo, useState } from "react";
import { useMySalon } from "@/lib/hooks/useMySalon";
import { useSalonStaff } from "@/lib/hooks/useStaff";
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

export default function AppointmentsPage() {
  const { data: salon, isLoading: loadingSalon } = useMySalon();
  const { data: staff } = useSalonStaff(salon?.id);
  const { data: availability } = useSalonAllAvailability(salon?.id);

  const [day, setDay] = useState(() => new Date());
  const { data: appointments, isLoading } = useSalonDayAppointments(salon?.id, day);

  const updateStatus = useUpdateAppointmentStatus(salon?.id ?? "");
  const [selected, setSelected] = useState<DayAppointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pending invites can't receive bookings, so they get no column.
  const columns = useMemo(
    () => (staff ?? []).filter((s) => s.status === "accepted").map((s) => ({ id: s.id, label: s.full_name })),
    [staff]
  );

  function handleChange(status: "confirmed" | "cancelled" | "completed") {
    if (!selected) return;
    setError(null);
    updateStatus.mutate(
      { appointmentId: selected.id, status },
      {
        onSuccess: () => setSelected(null),
        onError: (err) => setError(errorMessage(err)),
      }
    );
  }

  if (loadingSalon) return <p className="text-neutral-500">A carregar...</p>;
  if (!salon) return <p className="text-neutral-500">Cria primeiro o teu salão em &quot;Salão&quot;.</p>;

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Agenda</h1>

      <DayNavigator day={day} onChange={setDay} />

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {isLoading ? (
        <p className="text-neutral-500">A carregar...</p>
      ) : (
        <DaySchedule
          day={day}
          columns={columns}
          appointments={appointments ?? []}
          availability={availability ?? []}
          onSelect={setSelected}
          selectedId={selected?.id ?? null}
        />
      )}

      {selected ? (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4">
          <div>
            <p className="font-medium text-neutral-900">
              {selected.client?.full_name ?? "Cliente"} · {selected.services?.name ?? "Serviço"}
            </p>
            <p className="text-sm text-neutral-500">
              {new Date(selected.starts_at).toLocaleString("pt-PT", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {STATUS_LABEL[selected.status]}
              {selected.client?.phone ? ` · ${selected.client.phone}` : ""}
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
