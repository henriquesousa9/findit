import { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSalons } from "../../src/hooks/useSalons";
import { useNearbySalons, RADIUS_OPTIONS_KM, DEFAULT_RADIUS_KM } from "../../src/hooks/useNearbySalons";
import { useFavoriteSalonIds, useToggleFavorite } from "../../src/hooks/useFavorites";
import { notify } from "../../src/lib/alert";

export default function BrowseScreen() {
  const [city, setCity] = useState("");
  const [mode, setMode] = useState<"city" | "nearby">("city");
  const router = useRouter();

  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

  const cityQuery = useSalons(city);
  const nearby = useNearbySalons(mode === "nearby", radiusKm);
  const { data: favoriteIds } = useFavoriteSalonIds();
  const toggleFavorite = useToggleFavorite();

  const isLoading = mode === "city" ? cityQuery.isLoading : nearby.isLoading || nearby.loadingLocation;
  const salons = mode === "city" ? cityQuery.data : nearby.nearby;

  function handleToggleNearby() {
    if (mode === "nearby") {
      setMode("city");
      return;
    }
    setMode("nearby");
    nearby.requestLocation();
  }

  function handleToggleFavorite(salonId: string) {
    const isFavorite = favoriteIds?.has(salonId) ?? false;
    toggleFavorite.mutate(
      { salonId, isFavorite },
      { onError: (err: any) => notify("Erro", err?.message ?? "Tenta novamente.") }
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Filtrar por cidade..."
          value={city}
          onChangeText={(text) => {
            setCity(text);
            setMode("city");
          }}
        />
        <Pressable style={[styles.nearbyButton, mode === "nearby" && styles.nearbyButtonActive]} onPress={handleToggleNearby}>
          <Text style={mode === "nearby" ? styles.nearbyButtonTextActive : styles.nearbyButtonText}>Perto de mim</Text>
        </Pressable>
      </View>

      {mode === "nearby" ? (
        <View style={styles.radiusRow}>
          <Text style={styles.radiusLabel}>Até</Text>
          {RADIUS_OPTIONS_KM.map((km) => (
            <Pressable
              key={km}
              style={[styles.radiusChip, radiusKm === km && styles.radiusChipSelected]}
              onPress={() => setRadiusKm(km)}
            >
              <Text style={radiusKm === km ? styles.radiusChipTextSelected : styles.radiusChipText}>{km} km</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {mode === "nearby" && nearby.permissionDenied ? (
        <Text style={styles.error}>Sem permissão de localização — ativa-a nas definições para usar isto.</Text>
      ) : null}

      {isLoading ? <ActivityIndicator style={{ marginTop: 24 }} /> : null}
      {mode === "city" && cityQuery.error ? <Text style={styles.error}>Erro a carregar salões.</Text> : null}

      <FlatList
        data={salons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>
              {mode === "nearby"
                ? `Nenhum salão a menos de ${radiusKm} km. Tenta aumentar a distância.`
                : "Nenhum salão encontrado."}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const isFavorite = favoriteIds?.has(item.id) ?? false;
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/(client)/salon/${item.id}`)}>
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
              )}
              <Pressable style={styles.favoriteButton} onPress={() => handleToggleFavorite(item.id)}>
                <Text style={styles.favoriteIcon}>{isFavorite ? "♥" : "♡"}</Text>
              </Pressable>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.city}
                  {"distanceKm" in item ? ` · ${(item as { distanceKm: number }).distanceKm.toFixed(1)} km` : ""}
                </Text>
                {item.address ? <Text style={styles.cardAddress}>{item.address}</Text> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchRow: { flexDirection: "row", gap: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  nearbyButton: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 14, justifyContent: "center" },
  nearbyButtonActive: { backgroundColor: "#111", borderColor: "#111" },
  nearbyButtonText: { color: "#333", fontWeight: "600", fontSize: 13 },
  nearbyButtonTextActive: { color: "#fff", fontWeight: "600", fontSize: 13 },
  radiusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  radiusLabel: { fontSize: 13, color: "#555", marginRight: 2 },
  radiusChip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 16, paddingVertical: 5, paddingHorizontal: 10 },
  radiusChipSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  radiusChipText: { color: "#333", fontSize: 12 },
  radiusChipTextSelected: { color: "#fff", fontSize: 12 },
  card: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10, overflow: "hidden" },
  cardImage: { width: "100%", height: 120 },
  cardImagePlaceholder: { backgroundColor: "#f2f2f2" },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: { fontSize: 18, color: "#c0392b" },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  cardSubtitle: { color: "#555", marginTop: 2 },
  cardAddress: { color: "#888", marginTop: 4, fontSize: 13 },
  error: { color: "#c0392b", marginTop: 12 },
  empty: { textAlign: "center", color: "#888", marginTop: 32 },
});
