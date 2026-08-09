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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner-appointments", salonId] }),
  });
}
