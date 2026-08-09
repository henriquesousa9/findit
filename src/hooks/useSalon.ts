import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Salon } from "./useSalons";

export type Service = {
  id: string;
  salon_id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  photo_url: string | null;
};

export function useSalon(salonId: string | undefined) {
  return useQuery({
    queryKey: ["salon", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const { data, error } = await supabase.from("salons").select("*").eq("id", salonId as string).single();
      if (error) throw error;
      return data as Salon;
    },
  });
}

export function useSalonServices(salonId: string | undefined) {
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
