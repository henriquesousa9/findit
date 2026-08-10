import { useQuery } from "@tanstack/react-query";
import { createClient } from "../supabase/client";
import { useAuth } from "./useAuth";

export type StaffMembership = {
  id: string; // staff.id
  salon_id: string;
  salon: { name: string } | null;
};

// Only accepted memberships — a pending invite doesn't grant staff access yet.
export function useMyStaffMemberships() {
  const supabase = createClient();
  const { session } = useAuth();
  return useQuery({
    queryKey: ["my-staff-memberships", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, salon_id, salon:salons(name)")
        .eq("profile_id", session!.user.id)
        .eq("status", "accepted");
      if (error) throw error;
      return data as unknown as StaffMembership[];
    },
  });
}
