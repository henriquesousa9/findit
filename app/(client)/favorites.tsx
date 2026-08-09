import { View, Text, FlatList, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useMyFavorites, useToggleFavorite } from "../../src/hooks/useFavorites";
import { notify } from "../../src/lib/alert";

export default function FavoritesScreen() {
  const { data: favorites, isLoading, error } = useMyFavorites();
  const toggleFavorite = useToggleFavorite();
  const router = useRouter();

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (error) return <Text style={styles.error}>Erro a carregar favoritos.</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Ainda não tens salões favoritos.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/(client)/salon/${item.id}`)}>
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.city}</Text>
            </View>
            <Pressable
              style={styles.removeButton}
              onPress={() =>
                toggleFavorite.mutate(
                  { salonId: item.id, isFavorite: true },
                  { onError: (err: any) => notify("Erro", err?.message ?? "Tenta novamente.") }
                )
              }
            >
              <Text style={styles.removeIcon}>♥</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, overflow: "hidden", flexDirection: "row", alignItems: "center" },
  cardImage: { width: 72, height: 72 },
  cardImagePlaceholder: { backgroundColor: "#f2f2f2" },
  cardBody: { flex: 1, padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSubtitle: { color: "#555", marginTop: 2 },
  removeButton: { padding: 14 },
  removeIcon: { fontSize: 20, color: "#c0392b" },
  empty: { textAlign: "center", color: "#888", marginTop: 32 },
  error: { color: "#c0392b", marginTop: 40, textAlign: "center" },
});
