import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";

export type Availability = {
  id: string;
  salon_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export function useSalonAvailability(salonId: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["availability", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability")
        .select("id, salon_id, weekday, start_time, end_time")
        .eq("salon_id", salonId as string)
        .order("weekday");
      if (error) throw error;
      return data as Availability[];
    },
  });
}

export function useCreateAvailability(salonId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { weekday: number; startTime: string; endTime: string }) => {
      const { data, error } = await supabase
        .from("availability")
        .insert({ salon_id: salonId, weekday: input.weekday, start_time: input.startTime, end_time: input.endTime })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability", salonId] }),
  });
}

export function useDeleteAvailability(salonId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (availabilityId: string) => {
      const { error } = await supabase.from("availability").delete().eq("id", availabilityId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability", salonId] }),
  });
}
