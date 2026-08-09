import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";

export type Availability = {
  id: string;
  salon_id: string;
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

// Availability belongs to a specific staff member, not the salon as a whole
// (see migration 0010) — every read and write here is scoped to one.
export function useSalonAvailability(salonId: string | undefined, staffId: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["availability", salonId, staffId],
    enabled: !!salonId && !!staffId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability")
        .select("id, salon_id, staff_id, weekday, start_time, end_time")
        .eq("salon_id", salonId as string)
        .eq("staff_id", staffId as string)
        .order("weekday");
      if (error) throw error;
      return data as Availability[];
    },
  });
}

export function useCreateAvailability(salonId: string, staffId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { weekday: number; startTime: string; endTime: string }) => {
      const { data, error } = await supabase
        .from("availability")
        .insert({
          salon_id: salonId,
          staff_id: staffId,
          weekday: input.weekday,
          start_time: input.startTime,
          end_time: input.endTime,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability", salonId, staffId] }),
  });
}

export function useDeleteAvailability(salonId: string, staffId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (availabilityId: string) => {
      const { error } = await supabase.from("availability").delete().eq("id", availabilityId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability", salonId, staffId] }),
  });
}
