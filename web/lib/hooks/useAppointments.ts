import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";

export type OwnerAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  services: { name: string; price_cents: number } | null;
  staff: { full_name: string } | null;
};

// RLS scopes appointments to the salon owned by the caller — no extra
// filter needed here beyond salon_id.
export function useOwnerAppointments(salonId: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["owner-appointments", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, services(name, price_cents), staff(full_name)")
        .eq("salon_id", salonId as string)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OwnerAppointment[];
    },
  });
}

export type DayAppointment = {
  id: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  services: { name: string } | null;
  // Readable only because of the profiles_select_salon_client policy, and
  // only for clients who booked here — null for anyone without access.
  client: { full_name: string | null; phone: string | null } | null;
};

export function dayBounds(day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// Only the day being displayed, rather than the salon's whole history —
// the calendar renders one day at a time and this grows unbounded otherwise.
export function useSalonDayAppointments(salonId: string | undefined, day: Date) {
  const supabase = createClient();
  const { start, end } = dayBounds(day);
  return useQuery({
    queryKey: ["day-appointments", salonId, start.toISOString()],
    enabled: !!salonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, staff_id, starts_at, ends_at, status, services(name), client:profiles(full_name, phone)")
        .eq("salon_id", salonId as string)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as unknown as DayAppointment[];
    },
  });
}

export function useUpdateAppointmentStatus(salonId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { appointmentId: string; status: OwnerAppointment["status"] }) => {
      const { data, error } = await supabase.rpc("update_appointment_status", {
        p_appointment_id: input.appointmentId,
        p_status: input.status,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // The overview stats and the calendar read through different keys;
      // a status change has to refresh both.
      queryClient.invalidateQueries({ queryKey: ["owner-appointments", salonId] });
      queryClient.invalidateQueries({ queryKey: ["day-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["staff-appointments"] });
    },
  });
}
