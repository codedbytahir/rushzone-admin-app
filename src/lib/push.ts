import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";
export async function registerPushToken() {
  if (Platform.OS === "web") return null;
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
  if (Platform.OS === "web") return () => {};
  const sub1 = Notifications.addNotificationReceivedListener((n) => onReceive?.(n));
  const sub2 = Notifications.addNotificationResponseReceivedListener((r) => onTap?.(r));
  return () => { sub1.remove(); sub2.remove(); };
}
if (Platform.OS !== "web") Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }) } as any);
