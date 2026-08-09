import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Salon } from "./useSalons";

export type AdminSalon = Salon & {
  owner: { full_name: string | null; phone: string | null } | null;
};

// Relies on the "salons_admin_all" / "profiles_select_admin" RLS policies —
// only rows visible to an actual admin come back here regardless of owner.
export function useAllSalonsAdmin() {
  return useQuery({
    queryKey: ["admin-salons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("*, owner:profiles(full_name, phone)")
        .order("name");
      if (error) throw error;
      return data as unknown as AdminSalon[];
    },
  });
}

export function useUpdateSalonAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      city: string;
      address?: string;
      description?: string;
    }) => {
      const { id, ...fields } = input;
      const { data, error } = await supabase.from("salons").update(fields).eq("id", id).select().single();
      if (error) throw error;
      return data as Salon;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-salons"] });
      queryClient.invalidateQueries({ queryKey: ["salon", vars.id] });
    },
  });
}

export function useDeleteSalonAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (salonId: string) => {
      const { error } = await supabase.from("salons").delete().eq("id", salonId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-salons"] }),
  });
}
