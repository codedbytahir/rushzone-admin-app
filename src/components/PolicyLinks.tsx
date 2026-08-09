import { View, Text, Pressable, Linking } from "react-native";
import { tokens } from "../theme/tokens";
import { useAppConfig } from "../hooks/useAppConfig";
export function PolicyLinks() {
  const { config } = useAppConfig();
  if (!config) return null;
  const items = [
    { label: "Terms", url: config.policies.terms },
    { label: "Privacy", url: config.policies.privacy },
    { label: "Tournament Rules", url: config.policies.tournament_rules },
    { label: "Wallet", url: config.policies.wallet },
    { label: "Rewards", url: config.policies.rewards },
    { label: "Landing Page", url: config.landing_page_url },
    { label: "Home", url: config.home_page_url },
  ];
  return (
    <View style={{ backgroundColor: tokens.color.surface, borderRadius: tokens.radius.card, padding: 12, borderWidth: 1, borderColor: tokens.color.border }}>
      {items.map((it) => (
        <Pressable key={it.label} onPress={() => Linking.openURL(it.url)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: tokens.color.border }}>
          <Text style={{ color: tokens.color.ink, fontWeight: "600" }}>{it.label}</Text>
          <Text style={{ color: tokens.color.secondary, fontSize: 12 }}>{it.url}</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => Linking.openURL(config.whatsapp_support_url)} style={{ backgroundColor: tokens.color.primary, borderRadius: tokens.radius.button, padding: 12, alignItems: "center", marginTop: 12 }}>
        <Text style={{ color: "white", fontWeight: "700" }}>Contact Support</Text>
      </Pressable>
    </View>
  );
}
