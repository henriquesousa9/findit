import { useCallback, useState } from "react";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Salon } from "./useSalons";

export type NearbySalon = Salon & { latitude: number; longitude: number; distanceKm: number };

// Haversine formula — good enough accuracy for "salons near me" at city
// scale, computed client-side over the (already public) salons list rather
// than adding PostGIS just for this.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Radii offered in the UI, in kilometres. 10 km is the default: wide enough
// to cover a city, narrow enough that "near me" means something.
export const RADIUS_OPTIONS_KM = [5, 10, 25, 50];
export const DEFAULT_RADIUS_KM = 10;

export function useNearbySalons(enabled: boolean, radiusKm: number = DEFAULT_RADIUS_KM) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const requestLocation = useCallback(async () => {
    setLoadingLocation(true);
    setPermissionDenied(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  const salonsQuery = useQuery({
    queryKey: ["salons-with-location"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("id, name, address, city, description, photo_url, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      if (error) throw error;
      return data as (Salon & { latitude: number; longitude: number })[];
    },
  });

  // Sorting alone isn't "near me" — without the radius filter a salon
  // hundreds of kilometres away still showed up, just last in the list.
  const nearby: NearbySalon[] = coords
    ? (salonsQuery.data ?? [])
        .map((s) => ({ ...s, distanceKm: haversineKm(coords.latitude, coords.longitude, s.latitude, s.longitude) }))
        .filter((s) => s.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : [];

  return {
    coords,
    requestLocation,
    permissionDenied,
    loadingLocation,
    nearby,
    isLoading: salonsQuery.isLoading,
  };
}
