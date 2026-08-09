import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useSalonAvailability } from "./useAvailability";

export { useSalonAvailability as useOwnerAvailabilityList };

export function useCreateAvailability(salonId: string, staffId: string) {
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (availabilityId: string) => {
      const { error } = await supabase.from("availability").delete().eq("id", availabilityId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability", salonId, staffId] }),
  });
}
