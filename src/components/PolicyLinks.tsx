import { View, Text, Pressable, Linking } from "react-native";
import { tokens } from "../theme/tokens";
import { useAppConfig } from "../hooks/useAppConfig";

export function PolicyLinks() {
  const { config } = useAppConfig();
  if (!config || !config.policies) return null;

  const items = [
    { label: "Terms", url: config.policies?.terms ?? "https://rushzone.pk/terms" },
    { label: "Privacy", url: config.policies?.privacy ?? "https://rushzone.pk/privacy" },
    { label: "Tournament Rules", url: config.policies?.tournament_rules ?? "https://rushzone.pk/rules" },
    { label: "Wallet", url: config.policies?.wallet ?? "https://rushzone.pk/wallet" },
    { label: "Rewards", url: config.policies?.rewards ?? "https://rushzone.pk/rewards" },
    { label: "Landing Page", url: config.landing_page_url ?? "https://rushzone.pk" },
    { label: "Home", url: config.home_page_url ?? "https://rushzone.pk" },
  ];

  return (
    <View style={{ backgroundColor: tokens.color.surface, borderRadius: tokens.radius.card, padding: 12, borderWidth: 1, borderColor: tokens.color.border }}>
      {items.map((it) => (
        <Pressable key={it.label} onPress={() => it.url && Linking.openURL(it.url)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: tokens.color.border }}>
          <Text style={{ color: tokens.color.ink, fontWeight: "600" }}>{it.label}</Text>
          <Text style={{ color: tokens.color.secondary, fontSize: 12 }}>{it.url}</Text>
        </Pressable>
      ))}
      {config.whatsapp_support_url && (
        <Pressable onPress={() => Linking.openURL(config.whatsapp_support_url)} style={{ backgroundColor: tokens.color.primary, borderRadius: tokens.radius.button, padding: 12, alignItems: "center", marginTop: 12 }}>
          <Text style={{ color: "white", fontWeight: "700" }}>Contact Support</Text>
        </Pressable>
      )}
    </View>
  );
}
