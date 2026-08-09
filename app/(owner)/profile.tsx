import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";

export default function OwnerProfileScreen() {
  const { session, profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Nome</Text>
        <Text style={styles.value}>{profile?.full_name ?? "—"}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{session?.user.email}</Text>
        <Text style={styles.label}>Tipo de conta</Text>
        <Text style={styles.value}>Owner</Text>
      </View>

      <Pressable style={styles.signOut} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 24 },
  card: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 16, gap: 4 },
  label: { fontSize: 12, color: "#888", marginTop: 8 },
  value: { fontSize: 16, fontWeight: "600" },
  signOut: { borderWidth: 1, borderColor: "#c0392b", borderRadius: 8, padding: 14, alignItems: "center" },
  signOutText: { color: "#c0392b", fontWeight: "600", fontSize: 16 },
});
