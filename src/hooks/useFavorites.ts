import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Salon } from "./useSalons";

// RLS scopes favorites to auth.uid() = client_id, so this is always "my"
// favorites regardless of the join.
export function useMyFavorites() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["favorites", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("salon_id, salons(id, name, address, city, description, photo_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => row.salons).filter(Boolean) as unknown as Salon[];
    },
  });
}

export function useFavoriteSalonIds() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["favorite-ids", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("salon_id");
      if (error) throw error;
      return new Set((data ?? []).map((row) => row.salon_id));
    },
  });
}

export function useToggleFavorite() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { salonId: string; isFavorite: boolean }) => {
      if (!session?.user?.id) throw new Error("not authenticated");
      if (input.isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("client_id", session.user.id)
          .eq("salon_id", input.salonId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ client_id: session.user.id, salon_id: input.salonId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-ids"] });
    },
  });
}
