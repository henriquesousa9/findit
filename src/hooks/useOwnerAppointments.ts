import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type OwnerAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  services: { name: string } | null;
  // Readable only via the profiles_select_salon_client policy, and only for
  // clients who booked at this salon.
  client: { full_name: string | null; phone: string | null } | null;
};

// RLS on appointments already scopes rows to appointments belonging to a
// salon owned by the caller (or their own, as a client) — no extra filter
// needed here.
export function useOwnerAppointments(salonId: string | undefined) {
  return useQuery({
    queryKey: ["owner-appointments", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, services(name), client:profiles(full_name, phone)")
        .eq("salon_id", salonId as string)
        .order("starts_at");
      if (error) throw error;
      return data as unknown as OwnerAppointment[];
    },
  });
}
