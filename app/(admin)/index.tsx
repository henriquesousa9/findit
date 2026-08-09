import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { useAllSalonsAdmin } from "../../src/hooks/useAdminSalons";

export default function AdminSalonsScreen() {
  const { signOut } = useAuth();
  const { data: salons, isLoading, error } = useAllSalonsAdmin();
  const router = useRouter();

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (error) return <Text style={styles.error}>Erro a carregar salões.</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        data={salons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Ainda não existem salões.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/(admin)/salon/${item.id}`)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.city}</Text>
            <Text style={styles.cardOwner}>Owner: {item.owner?.full_name ?? "—"}</Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.signOut} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 14 },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  cardSubtitle: { color: "#555", marginTop: 2 },
  cardOwner: { color: "#888", marginTop: 4, fontSize: 13 },
  empty: { textAlign: "center", color: "#888", marginTop: 32 },
  error: { color: "#c0392b", marginTop: 40, textAlign: "center" },
  signOut: { padding: 16, alignItems: "center" },
  signOutText: { color: "#c0392b", fontWeight: "600" },
});
