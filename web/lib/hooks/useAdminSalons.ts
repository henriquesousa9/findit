import { useQuery } from "@tanstack/react-query";
import { createClient } from "../supabase/client";

export type AdminSalon = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  photo_url: string | null;
  owner: { full_name: string | null } | null;
};

// Relies on the "salons_admin_all" / "profiles_select_admin" RLS policies —
// a non-admin calling this simply gets their own visible rows, never
// everyone's, so the privilege lives in the database, not in this hook.
export function useAllSalonsAdmin() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["admin-salons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("id, name, city, address, photo_url, owner:profiles(full_name)")
        .order("name");
      if (error) throw error;
      return data as unknown as AdminSalon[];
    },
  });
}
