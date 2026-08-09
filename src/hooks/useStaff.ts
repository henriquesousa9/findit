import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type Staff = {
  id: string;
  salon_id: string;
  full_name: string;
  status: "pending" | "accepted";
};

export function useSalonStaff(salonId: string | undefined) {
  return useQuery({
    queryKey: ["salon-staff", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, salon_id, full_name, status")
        .eq("salon_id", salonId as string)
        .order("full_name");
      if (error) throw error;
      return data as Staff[];
    },
  });
}

// Only way to add staff — creates a *pending* invite for an existing
// account via the invite_staff_member RPC (SECURITY DEFINER). Their role
// only changes once they accept it themselves (see useAcceptInvite).
export function useInviteStaff(salonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string }) => {
      const { data, error } = await supabase.rpc("invite_staff_member", {
        p_salon_id: salonId,
        p_email: input.email,
      });
      if (error) throw error;
      return data as Staff;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salon-staff", salonId] }),
  });
}

// Goes through remove_staff_member (not a direct delete) so the profile's
// role is reverted to 'client' when this was their last staff membership.
export function useDeleteStaff(salonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase.rpc("remove_staff_member", { p_staff_id: staffId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["salon-staff", salonId] }),
  });
}
