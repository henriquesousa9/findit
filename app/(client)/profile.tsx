import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";
import { useMyPendingInvites, useAcceptInvite, useDeclineInvite } from "../../src/hooks/useMyStaffMemberships";
import { notify } from "../../src/lib/alert";

export default function ClientProfileScreen() {
  const { session, profile, signOut, refreshProfile } = useAuth();
  const { data: invites, isLoading: loadingInvites } = useMyPendingInvites();
  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();

  async function handleAccept(staffId: string) {
    try {
      await acceptInvite.mutateAsync(staffId);
      await refreshProfile();
      notify("Convite aceite", "Já és staff deste salão — a app vai levar-te para a tua área.");
    } catch (err: any) {
      notify("Não foi possível aceitar", err?.message ?? "Tenta novamente.");
    }
  }

  function handleDecline(staffId: string) {
    declineInvite.mutate(staffId, {
      onError: (err: any) => notify("Não foi possível recusar", err?.message ?? "Tenta novamente."),
    });
  }

  return (
    <View style={styles.container}>
      {loadingInvites ? null : invites && invites.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>Convites para staff</Text>
          <FlatList
            data={invites}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <View style={styles.inviteCard}>
                <Text style={styles.inviteText}>
                  Convite para seres staff em <Text style={{ fontWeight: "700" }}>{item.salon?.name ?? "um salão"}</Text>
                </Text>
                <View style={styles.inviteActions}>
                  <Pressable
                    style={styles.acceptButton}
                    onPress={() => handleAccept(item.id)}
                    disabled={acceptInvite.isPending}
                  >
                    <Text style={styles.acceptButtonText}>Aceitar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.declineButton}
                    onPress={() => handleDecline(item.id)}
                    disabled={declineInvite.isPending}
                  >
                    <Text style={styles.declineButtonText}>Recusar</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Nome</Text>
        <Text style={styles.value}>{profile?.full_name ?? "—"}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{session?.user.email}</Text>
        <Text style={styles.label}>Tipo de conta</Text>
        <Text style={styles.value}>Cliente</Text>
      </View>

      <Pressable style={styles.signOut} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  inviteCard: { borderWidth: 1, borderColor: "#2563eb", borderRadius: 10, padding: 14, gap: 10 },
  inviteText: { fontSize: 14 },
  inviteActions: { flexDirection: "row", gap: 12 },
  acceptButton: { backgroundColor: "#2563eb", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  acceptButtonText: { color: "#fff", fontWeight: "600" },
  declineButton: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  declineButtonText: { color: "#333", fontWeight: "600" },
  card: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 16, gap: 4 },
  label: { fontSize: 12, color: "#888", marginTop: 8 },
  value: { fontSize: 16, fontWeight: "600" },
  signOut: { borderWidth: 1, borderColor: "#c0392b", borderRadius: 8, padding: 14, alignItems: "center" },
  signOutText: { color: "#c0392b", fontWeight: "600", fontSize: 16 },
});
