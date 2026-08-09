import { View, Text, FlatList, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSalon, useSalonServices } from "../../../src/hooks/useSalon";
import { useFavoriteSalonIds, useToggleFavorite } from "../../../src/hooks/useFavorites";
import { notify } from "../../../src/lib/alert";

export default function SalonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: salon, isLoading: loadingSalon } = useSalon(id);
  const { data: services, isLoading: loadingServices } = useSalonServices(id);
  const { data: favoriteIds } = useFavoriteSalonIds();
  const toggleFavorite = useToggleFavorite();

  if (loadingSalon) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (!salon) return <Text style={styles.error}>Salão não encontrado.</Text>;

  const isFavorite = favoriteIds?.has(salon.id) ?? false;

  function handleToggleFavorite() {
    toggleFavorite.mutate(
      { salonId: salon!.id, isFavorite },
      { onError: (err: any) => notify("Erro", err?.message ?? "Tenta novamente.") }
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ minHeight: 44 }}>
        {salon.photo_url ? <Image source={{ uri: salon.photo_url }} style={styles.cover} /> : null}
        <Pressable style={styles.favoriteButton} onPress={handleToggleFavorite}>
          <Text style={styles.favoriteIcon}>{isFavorite ? "♥" : "♡"}</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>{salon.name}</Text>
      <Text style={styles.subtitle}>{salon.city}{salon.address ? ` · ${salon.address}` : ""}</Text>
      {salon.description ? <Text style={styles.description}>{salon.description}</Text> : null}

      <Text style={styles.sectionTitle}>Serviços</Text>
      {loadingServices ? <ActivityIndicator /> : null}
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8 }}
        ListEmptyComponent={!loadingServices ? <Text style={styles.empty}>Sem serviços disponíveis.</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/(client)/booking/[serviceId]",
                params: { serviceId: item.id, salonId: salon.id, serviceName: item.name },
              })
            }
          >
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>
                {item.duration_minutes} min · {(item.price_cents / 100).toFixed(2)} €
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  cover: { width: "100%", height: 160, borderRadius: 10, marginBottom: 12 },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: { fontSize: 20, color: "#c0392b" },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#555", marginTop: 4 },
  description: { marginTop: 12, color: "#333" },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginTop: 20, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  thumbnail: { width: 48, height: 48, borderRadius: 8 },
  thumbnailPlaceholder: { backgroundColor: "#f2f2f2" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSubtitle: { color: "#555", marginTop: 2 },
  empty: { color: "#888" },
  error: { color: "#c0392b", marginTop: 40, textAlign: "center" },
});
