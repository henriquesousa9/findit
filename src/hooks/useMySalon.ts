import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Salon } from "./useSalons";

// RLS lets an owner write only rows where owner_id = auth.uid(), so this
// hook is scoped to "my salon" by construction, not by trusting a client
// filter alone.
export function useMySalon() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["my-salon", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("*")
        .eq("owner_id", session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Salon | null;
    },
  });
}

export function useUpsertMySalon() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      city: string;
      address?: string;
      description?: string;
      latitude?: number;
      longitude?: number;
    }) => {
      if (!session?.user?.id) throw new Error("not authenticated");
      const payload = { ...input, owner_id: session.user.id };
      const { data, error } = await supabase.from("salons").upsert(payload).select().single();
      if (error) throw error;
      return data as Salon;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-salon"] }),
  });
}

export function useUpdateSalonLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { salonId: string; latitude: number; longitude: number }) => {
      const { error } = await supabase
        .from("salons")
        .update({ latitude: input.latitude, longitude: input.longitude })
        .eq("id", input.salonId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["my-salon"] });
      queryClient.invalidateQueries({ queryKey: ["admin-salons"] });
      queryClient.invalidateQueries({ queryKey: ["salon", vars.salonId] });
    },
  });
}
