import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";
export async function registerPushToken() {
  const perm = await Notifications.requestPermissionsAsync();
  if (perm.status !== "granted") return null;
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: "default", importance: Notifications.AndroidImportance.MAX });
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return token;
  await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/push-token-register`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session.access_token}` }, body: JSON.stringify({ token, platform: Platform.OS }) });
  return token;
}
export function addNotificationListeners(onReceive?: (n: any) => void, onTap?: (r: any) => void) {
  const sub1 = Notifications.addNotificationReceivedListener((n) => onReceive?.(n));
  const sub2 = Notifications.addNotificationResponseReceivedListener((r) => onTap?.(r));
  return () => { sub1.remove(); sub2.remove(); };
}
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }) });
