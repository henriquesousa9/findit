import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export type StaffMembership = {
  id: string; // staff.id
  salon_id: string;
  salon: { name: string } | null;
};

// RLS ("staff_select_public" is open-read, but we filter by profile_id here
// so this always means "the salons I work at", not everyone's staff rows).
// Only accepted memberships — pending invites don't grant staff access yet.
export function useMyStaffMemberships() {
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

export function useMyPendingInvites() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["my-pending-invites", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, salon_id, salon:salons(name)")
        .eq("profile_id", session!.user.id)
        .eq("status", "pending");
      if (error) throw error;
      return data as unknown as StaffMembership[];
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase.rpc("accept_staff_invite", { p_staff_id: staffId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pending-invites"] });
      queryClient.invalidateQueries({ queryKey: ["my-staff-memberships"] });
    },
  });
}

export function useDeclineInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase.rpc("decline_staff_invite", { p_staff_id: staffId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-pending-invites"] }),
  });
}
