import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type AvailableSlot = {
  slot: string;
  free_staff: number;
};

function toDateOnly(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

// The hours a client can actually book. Computed server-side because it
// depends on everyone's bookings, which RLS (rightly) hides from clients —
// the function returns only "this hour is free", never who booked what.
// staffId undefined means "no preference".
export function useAvailableSlots(
  salonId: string | undefined,
  serviceId: string | undefined,
  day: Date,
  staffId: string | undefined
) {
  const dayKey = toDateOnly(day);
  return useQuery({
    queryKey: ["available-slots", salonId, serviceId, dayKey, staffId ?? "any"],
    enabled: !!salonId && !!serviceId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_salon_id: salonId,
        p_service_id: serviceId,
        p_day: dayKey,
        p_staff_id: staffId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as AvailableSlot[];
    },
  });
}
