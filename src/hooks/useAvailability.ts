import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type Availability = {
  id: string;
  salon_id: string;
  staff_id: string;
  weekday: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
};

export function useSalonAvailability(salonId: string | undefined, staffId: string | undefined) {
  return useQuery({
    queryKey: ["availability", salonId, staffId],
    enabled: !!salonId && !!staffId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability")
        .select("id, salon_id, staff_id, weekday, start_time, end_time")
        .eq("salon_id", salonId as string)
        .eq("staff_id", staffId as string);
      if (error) throw error;
      return data as Availability[];
    },
  });
}
