import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient, processLock } from "@supabase/supabase-js";

// SecureStore is encrypted-at-rest storage (Keychain on iOS, Keystore on
// Android). Session tokens must never be kept in plain AsyncStorage.
// expo-secure-store has no web implementation, so web (used for local
// preview only — the shipped product is the native app) falls back to
// localStorage, which is the same tradeoff Supabase's own web SDK makes.
const SecureStoreAdapter = {
  getItem: (key: string) =>
    Platform.OS === "web" ? Promise.resolve(window.localStorage.getItem(key)) : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    Platform.OS === "web"
      ? Promise.resolve(window.localStorage.setItem(key, value))
      : SecureStore.setItemAsync(key, value),
  removeItem: (key: string) =>
    Platform.OS === "web" ? Promise.resolve(window.localStorage.removeItem(key)) : SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your Supabase project values."
  );
}

// Only the `anon` key belongs here. The `service_role` key bypasses RLS and
// must never ship inside the client app.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});
