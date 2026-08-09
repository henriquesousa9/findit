import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useSalonServices } from "./useSalon";

export { useSalonServices as useOwnerServiceList };

export function useCreateService(salonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; durationMinutes: number; priceCents: number }) => {
      const { data, error } = await supabase
        .from("services")
        .insert({
          salon_id: salonId,
          name: input.name,
          duration_minutes: input.durationMinutes,
          price_cents: input.priceCents,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salon-services", salonId] }),
  });
}

export function useDeleteService(salonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase.from("services").delete().eq("id", serviceId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salon-services", salonId] }),
  });
}
