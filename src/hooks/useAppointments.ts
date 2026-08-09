import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type Appointment = {
  id: string;
  client_id: string;
  salon_id: string;
  service_id: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
};

// RLS restricts this to the caller's own appointments (as client) or, for
// salon owners, appointments belonging to their salon — no client-side
// filtering by user id is needed or trusted here.
export function useMyAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data as Appointment[];
    },
  });
}

// Scoped explicitly to the given staff.id values (the caller's own staff
// memberships) so a staff account only sees appointments assigned to them,
// not any stray "as client" rows RLS would also let through.
export function useMyStaffAppointments(staffIds: string[]) {
  return useQuery({
    queryKey: ["staff-appointments", staffIds],
    enabled: staffIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, services(name)")
        .in("staff_id", staffIds)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data as unknown as (Appointment & { services: { name: string } | null })[];
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { salonId: string; serviceId: string; staffId: string; startsAt: Date }) => {
      const { data, error } = await supabase.rpc("create_appointment", {
        p_salon_id: input.salonId,
        p_service_id: input.serviceId,
        p_staff_id: input.staffId,
        p_starts_at: input.startsAt.toISOString(),
      });
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { appointmentId: string; status: Appointment["status"] }) => {
      const { data, error } = await supabase.rpc("update_appointment_status", {
        p_appointment_id: input.appointmentId,
        p_status: input.status,
      });
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["staff-appointments"] });
    },
  });
}
