"use client";

import { useMySalon } from "@/lib/hooks/useMySalon";
import { useOwnerAppointments, useUpdateAppointmentStatus } from "@/lib/hooks/useAppointments";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-green-100 text-green-700",
};

export default function AppointmentsPage() {
  const { data: salon, isLoading: loadingSalon } = useMySalon();
  const { data: appointments, isLoading } = useOwnerAppointments(salon?.id);
  const updateStatus = useUpdateAppointmentStatus(salon?.id ?? "");

  function handleChange(id: string, status: "confirmed" | "cancelled" | "completed") {
    updateStatus.mutate({ appointmentId: id, status });
  }

  if (loadingSalon) return <p className="text-neutral-500">A carregar...</p>;
  if (!salon) return <p className="text-neutral-500">Cria primeiro o teu salão em &quot;Salão&quot;.</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Agendamentos</h1>

      <div className="space-y-2">
        {isLoading ? <p className="text-neutral-500">A carregar...</p> : null}
        {appointments?.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
            <div>
              <p className="font-medium">{a.services?.name ?? "Serviço"}</p>
              <p className="text-sm text-neutral-500">
                {new Date(a.starts_at).toLocaleString("pt-PT", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {a.staff ? ` · com ${a.staff.full_name}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[a.status]}`}>
                {STATUS_LABEL[a.status]}
              </span>
              {a.status === "pending" ? (
                <>
                  <button onClick={() => handleChange(a.id, "confirmed")} className="text-sm font-medium text-blue-600 hover:underline">
                    Confirmar
                  </button>
                  <button onClick={() => handleChange(a.id, "cancelled")} className="text-sm font-medium text-red-600 hover:underline">
                    Cancelar
                  </button>
                </>
              ) : null}
              {a.status === "confirmed" ? (
                <>
                  <button onClick={() => handleChange(a.id, "completed")} className="text-sm font-medium text-blue-600 hover:underline">
                    Concluir
                  </button>
                  <button onClick={() => handleChange(a.id, "cancelled")} className="text-sm font-medium text-red-600 hover:underline">
                    Cancelar
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ))}
        {!isLoading && appointments?.length === 0 ? <p className="text-neutral-500">Sem agendamentos.</p> : null}
      </div>
    </div>
  );
}
