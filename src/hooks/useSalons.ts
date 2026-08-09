import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type Salon = {
  id: string;
  name: string;
  address: string | null;
  city: string;
  description: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function useSalons(city: string) {
  return useQuery({
    queryKey: ["salons", city],
    queryFn: async () => {
      let query = supabase
        .from("salons")
        .select("id, name, address, city, description, photo_url, latitude, longitude")
        .order("name");
      if (city.trim()) query = query.ilike("city", `%${city.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Salon[];
    },
  });
}
