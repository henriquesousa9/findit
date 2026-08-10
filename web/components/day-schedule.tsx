"use client";

import { useEffect, useState } from "react";
import type { Availability } from "@/lib/hooks/useAvailability";
import type { DayAppointment } from "@/lib/hooks/useAppointments";

const HOUR_HEIGHT = 64; // px per hour — drives every vertical calculation
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;

export type ScheduleColumn = { id: string; label: string };

const STATUS_STYLE: Record<DayAppointment["status"], string> = {
  pending: "border-amber-300 bg-amber-100 text-amber-900",
  confirmed: "border-blue-300 bg-blue-100 text-blue-900",
  completed: "border-green-300 bg-green-100 text-green-900",
  cancelled: "border-neutral-200 bg-neutral-100 text-neutral-400 line-through",
};

const STATUS_LABEL: Record<DayAppointment["status"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

// "09:00:00" -> 540
function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function DayNavigator({ day, onChange }: { day: Date; onChange: (day: Date) => void }) {
  function shift(days: number) {
    const next = new Date(day);
    next.setDate(next.getDate() + days);
    onChange(next);
  }

  const today = new Date();

  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        type="button"
        onClick={() => shift(-1)}
        aria-label="Dia anterior"
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
      >
        ←
      </button>
      <button
        type="button"
        onClick={() => shift(1)}
        aria-label="Dia seguinte"
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
      >
        →
      </button>
      <button
        type="button"
        onClick={() => onChange(new Date())}
        disabled={isSameDay(day, today)}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
      >
        Hoje
      </button>
      <p className="ml-2 text-sm font-medium text-neutral-800">
        {day.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

export function DaySchedule({
  day,
  columns,
  appointments,
  availability,
  onSelect,
  selectedId,
}: {
  day: Date;
  columns: ScheduleColumn[];
  appointments: DayAppointment[];
  availability: Availability[];
  onSelect?: (appointment: DayAppointment) => void;
  selectedId?: string | null;
}) {
  // Re-render every minute so the "now" line actually moves.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const weekday = day.getDay();
  const dayAvailability = availability.filter((a) => a.weekday === weekday);

  // Frame the grid around the day's working hours, widening if an
  // appointment sits outside them (a booking made before hours changed).
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;

  if (dayAvailability.length > 0) {
    startHour = Math.floor(Math.min(...dayAvailability.map((a) => timeToMinutes(a.start_time))) / 60);
    endHour = Math.ceil(Math.max(...dayAvailability.map((a) => timeToMinutes(a.end_time))) / 60);
  }
  for (const a of appointments) {
    startHour = Math.min(startHour, new Date(a.starts_at).getHours());
    endHour = Math.max(endHour, Math.ceil(minutesSinceMidnight(new Date(a.ends_at)) / 60));
  }
  if (endHour <= startHour) endHour = startHour + 1;

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = hours.length * HOUR_HEIGHT;
  const offsetFor = (minutes: number) => ((minutes - startHour * 60) / 60) * HOUR_HEIGHT;

  const showNowLine = isSameDay(day, now);
  const nowOffset = offsetFor(minutesSinceMidnight(now));

  if (columns.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-neutral-500">
        Sem profissionais para mostrar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <div className="min-w-[600px]">
        {/* Column headers */}
        <div className="flex border-b border-neutral-200">
          <div className="w-16 shrink-0" />
          {columns.map((col) => (
            <div
              key={col.id}
              className="flex-1 border-l border-neutral-200 px-3 py-3 text-center text-sm font-semibold text-neutral-800"
            >
              {col.label}
            </div>
          ))}
        </div>

        <div className="relative flex">
          {/* Hour axis */}
          <div className="w-16 shrink-0">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="relative border-b border-neutral-100 pr-2 text-right"
              >
                <span className="absolute -top-2 right-2 text-xs text-neutral-400">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {columns.map((col) => {
            const colAvailability = dayAvailability.filter((a) => a.staff_id === col.id);
            const colAppointments = appointments.filter((a) => a.staff_id === col.id);

            return (
              <div key={col.id} className="relative flex-1 border-l border-neutral-200" style={{ height: gridHeight }}>
                {/* Hour lines */}
                {hours.map((hour) => (
                  <div key={hour} style={{ height: HOUR_HEIGHT }} className="border-b border-neutral-100" />
                ))}

                {/* Working hours, shaded behind everything else */}
                {colAvailability.map((a) => {
                  const top = offsetFor(timeToMinutes(a.start_time));
                  const height = offsetFor(timeToMinutes(a.end_time)) - top;
                  return (
                    <div
                      key={a.id}
                      className="pointer-events-none absolute inset-x-0 bg-blue-50/60"
                      style={{ top, height }}
                    />
                  );
                })}

                {/* Appointments */}
                {colAppointments.map((appointment) => {
                  const start = new Date(appointment.starts_at);
                  const end = new Date(appointment.ends_at);
                  const top = offsetFor(minutesSinceMidnight(start));
                  const height = Math.max(
                    offsetFor(minutesSinceMidnight(end)) - top,
                    22 // keep very short bookings readable
                  );
                  const selected = selectedId === appointment.id;

                  return (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={() => onSelect?.(appointment)}
                      title={[
                        appointment.client?.full_name,
                        appointment.services?.name ?? "Serviço",
                        STATUS_LABEL[appointment.status],
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      style={{ top, height }}
                      className={`absolute inset-x-1 overflow-hidden rounded-lg border px-2 py-1 text-left text-xs ${
                        STATUS_STYLE[appointment.status]
                      } ${selected ? "ring-2 ring-neutral-900" : ""}`}
                    >
                      <span className="block font-medium">
                        {start.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                        {appointment.client?.full_name ? ` · ${appointment.client.full_name}` : ""}
                      </span>
                      <span className="block truncate">{appointment.services?.name ?? "Serviço"}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Current time, spanning every column */}
          {showNowLine && nowOffset >= 0 && nowOffset <= gridHeight ? (
            <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowOffset }}>
              <div className="ml-16 h-px bg-red-500" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
