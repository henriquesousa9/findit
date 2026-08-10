import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";

export type StaffAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  services: { name: string } | null;
};

// Scoped explicitly to the caller's own staff ids so a staff account sees
// only what's assigned to them, not any "as client" rows RLS also allows.
export function useMyStaffAppointments(staffIds: string[]) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["staff-appointments", staffIds],
    enabled: staffIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, services(name)")
        .in("staff_id", staffIds)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data as unknown as StaffAppointment[];
    },
  });
}

export function useUpdateStaffAppointmentStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { appointmentId: string; status: StaffAppointment["status"] }) => {
      const { data, error } = await supabase.rpc("update_appointment_status", {
        p_appointment_id: input.appointmentId,
        p_status: input.status,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-appointments"] }),
  });
}
