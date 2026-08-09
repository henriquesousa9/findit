import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";

// Registers this device's Expo push token for the signed-in user, so the
// notify_appointment_status_change() DB trigger can reach them. No-op (and
// silent) until the project has an EAS projectId and runs as a real build —
// Expo Go dropped remote push support in SDK 53+, so this only fully works
// there once an EAS development/production build exists.
export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId || !Device.isDevice) return;

    let cancelled = false;

    async function register() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return;

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled || !token) return;

        await supabase.from("push_tokens").upsert(
          { profile_id: userId, token, platform: Platform.OS === "ios" ? "ios" : "android" },
          { onConflict: "token" }
        );
      } catch {
        // No EAS project configured yet, or push unavailable in this
        // environment (e.g. Expo Go) — safe to skip silently.
      }
    }

    register();

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
