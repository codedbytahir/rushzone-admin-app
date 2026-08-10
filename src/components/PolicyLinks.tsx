import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Linking, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "../theme/tokens";
import { useAppConfig, type PolicyLink } from "../hooks/useAppConfig";
import { api } from "../lib/api";
import { hasPerm } from "../lib/adminSession";
import { AppButton, Card, FieldLabel } from "./ui";

// Fallback defaults in case app-config is unreachable or empty.
const FALLBACK_LINKS: PolicyLink[] = [
  { id: "terms", label: "Terms", url: "https://rushzone.example.com/terms" },
  { id: "privacy", label: "Privacy", url: "https://rushzone.example.com/privacy" },
  { id: "tournament_rules", label: "Tournament Rules", url: "https://rushzone.example.com/rules" },
  { id: "wallet", label: "Wallet", url: "https://rushzone.example.com/wallet" },
  { id: "rewards", label: "Rewards", url: "https://rushzone.example.com/rewards" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function PolicyLinks() {
  const { config } = useAppConfig();
  const canEdit = hasPerm("settings.manage");

  const [links, setLinks] = useState<PolicyLink[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Load once from the admin settings store (authoritative), falling back to app-config.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getPolicyLinks();
      let next: PolicyLink[] = [];
      if (res.data?.value && Array.isArray(res.data.value) && res.data.value.length > 0) {
        next = res.data.value;
      } else if (config?.policy_links?.length) {
        next = config.policy_links;
      } else if (config?.policies) {
        next = [
          { id: "terms", label: "Terms", url: config.policies.terms },
          { id: "privacy", label: "Privacy", url: config.policies.privacy },
          { id: "tournament_rules", label: "Tournament Rules", url: config.policies.tournament_rules },
          { id: "wallet", label: "Wallet", url: config.policies.wallet },
          { id: "rewards", label: "Rewards", url: config.policies.rewards },
        ];
      } else {
        next = FALLBACK_LINKS;
      }
      if (!cancelled) {
        setLinks(next);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config]);

  function updateLink(id: string, patch: Partial<PolicyLink>) {
    setMsg(null);
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLink() {
    setMsg(null);
    setLinks((prev) => [...prev, { id: uid(), label: "New Link", url: "https://" }]);
  }

  function removeLink(id: string) {
    setMsg(null);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleSave() {
    // Validate: every link needs a label and a http(s) URL.
    for (const l of links) {
      if (!l.label.trim()) {
        setMsg({ type: "err", text: `Link "${l.url || "untitled"}" needs a label.` });
        return;
      }
      const url = l.url.trim();
      if (!/^https?:\/\//i.test(url)) {
        setMsg({ type: "err", text: `Link "${l.label}" needs a valid http(s) URL.` });
        return;
      }
    }
    const clean = links.map((l) => ({ id: l.id || uid(), label: l.label.trim(), url: l.url.trim() }));
    setSaving(true);
    setMsg(null);
    const res = await api.savePolicyLinks(clean);
    setSaving(false);
    if (res.error) {
      setMsg({ type: "err", text: res.error.message ?? "Failed to save policy links." });
    } else {
      setLinks(clean);
      setMsg({ type: "ok", text: "Policy links saved. The player app picks these up on next config refresh." });
    }
  }

  if (!loaded) {
    return (
      <Card>
        <ActivityIndicator color={tokens.color.primary} style={{ marginVertical: 16 }} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: tokens.space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: tokens.color.creamPanel, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="link-outline" size={18} color={tokens.color.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: tokens.color.ink }}>Policy Links</Text>
          <Text style={{ fontSize: 13, color: tokens.color.secondary }}>
            {canEdit ? "Edit, add, or remove links shown in the player app's policy section" : "Links are shown in the player app's policy section"}
          </Text>
        </View>
      </View>

      {links.map((l, idx) => (
        <View
          key={l.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 8,
            borderTopWidth: idx === 0 ? 0 : 1,
            borderTopColor: tokens.color.border,
          }}
        >
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: tokens.color.canvas, borderWidth: 1, borderColor: tokens.color.border, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.color.secondary }}>{idx + 1}</Text>
          </View>
          {canEdit ? (
            <View style={{ flex: 1, gap: 6 }}>
              <TextInput
                value={l.label}
                onChangeText={(v) => updateLink(l.id, { label: v })}
                placeholder="Label"
                placeholderTextColor={tokens.color.disabled}
                style={inputStyle}
              />
              <TextInput
                value={l.url}
                onChangeText={(v) => updateLink(l.id, { url: v })}
                placeholder="https://…"
                placeholderTextColor={tokens.color.disabled}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={inputStyle}
              />
            </View>
          ) : (
            <Pressable
              style={{ flex: 1 }}
              onPress={() => l.url && Linking.openURL(l.url)}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: tokens.color.ink }}>{l.label}</Text>
              <Text style={{ fontSize: 12, color: tokens.color.primary }} numberOfLines={1}>{l.url}</Text>
            </Pressable>
          )}
          {canEdit && (
            <View style={{ gap: 6 }}>
              {l.url && /^https?:\/\//i.test(l.url) && (
                <Pressable
                  onPress={() => Linking.openURL(l.url)}
                  style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: tokens.color.canvas, borderWidth: 1, borderColor: tokens.color.border, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="open-outline" size={16} color={tokens.color.secondary} />
                </Pressable>
              )}
              <Pressable
                onPress={() => removeLink(l.id)}
                style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: tokens.color.dangerSoft, borderWidth: 1, borderColor: tokens.color.danger, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="trash-outline" size={15} color={tokens.color.danger} />
              </Pressable>
            </View>
          )}
        </View>
      ))}

      {canEdit && (
        <>
          <AppButton variant="secondary" label="Add Link" icon="add-circle-outline" onPress={addLink} />
          <AppButton label="Save Policy Links" icon="save-outline" loading={saving} onPress={handleSave} />
        </>
      )}

      {msg && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: tokens.radius.input, backgroundColor: msg.type === "ok" ? tokens.color.successSoft : tokens.color.dangerSoft }}>
          <Ionicons name={msg.type === "ok" ? "checkmark-circle" : "alert-circle"} size={16} color={msg.type === "ok" ? tokens.color.success : tokens.color.danger} />
          <Text style={{ flex: 1, fontSize: 13, color: msg.type === "ok" ? tokens.color.success : tokens.color.danger }}>{msg.text}</Text>
        </View>
      )}

      {config?.whatsapp_support_url && (
        <Pressable
          onPress={() => Linking.openURL(config.whatsapp_support_url!)}
          style={{ backgroundColor: tokens.color.primary, borderRadius: tokens.radius.button, padding: 13, alignItems: "center", marginTop: 4, flexDirection: "row", justifyContent: "center", gap: 8 }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={tokens.color.onPrimary} />
          <Text style={{ color: tokens.color.onPrimary, fontWeight: "700" }}>Contact Support</Text>
        </Pressable>
      )}
    </Card>
  );
}

const inputStyle = {
  backgroundColor: tokens.color.canvas,
  borderWidth: 1,
  borderColor: tokens.color.border,
  borderRadius: tokens.radius.input,
  paddingHorizontal: 10,
  paddingVertical: 8,
  color: tokens.color.ink,
  fontSize: 13,
} as const;
