import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";

export type Service = {
  id: string;
  salon_id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  photo_url: string | null;
};

export function useSalonServices(salonId: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["salon-services", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, salon_id, name, duration_minutes, price_cents, photo_url")
        .eq("salon_id", salonId as string)
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
  });
}

export function useCreateService(salonId: string) {
  const supabase = createClient();
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
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase.from("services").delete().eq("id", serviceId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salon-services", salonId] }),
  });
}
