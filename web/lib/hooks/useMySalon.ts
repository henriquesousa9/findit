import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";
import { useAuth } from "./useAuth";

export type Salon = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  city: string;
  description: string | null;
  photo_url: string | null;
};

// RLS lets an owner write only rows where owner_id = auth.uid(), so this
// hook is scoped to "my salon" by construction, not by trusting a client
// filter alone.
export function useMySalon() {
  const { session } = useAuth();
  const supabase = createClient();
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
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      city: string;
      address?: string;
      description?: string;
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
