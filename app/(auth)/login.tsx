import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { tokens } from "../../src/theme/tokens";
import { SunsetStripe } from "../../components/SunsetStripe";
import { supabase } from "../../src/lib/supabase";
import { api } from "../../src/lib/api";
export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "superkey">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  async function handlePasswordLogin() {
    if (!email.includes("@")) { setMsg("Enter valid email"); return; }
    if (password.length < 6) { setMsg("Password min 6 chars"); return; }
    setLoading(true); setMsg("");
    let { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error && error.message.includes("Invalid login")) {
      const { error: signErr } = await supabase.auth.signUp({ email: email.trim(), password });
      if (!signErr) {
        const res = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        error = res.error;
      } else error = signErr;
    }
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    setStep("superkey");
  }
  async function verifyKey() {
    if (key.length < 6) { setMsg("Enter Super Key"); return; }
    setLoading(true); setMsg("");
    const { data, error } = await api.verifySuperKey(key.trim());
    setLoading(false);
    if (error || !data?.ok) { setMsg((error as any)?.error?.message ?? "Unable to verify admin access."); return; }
    router.replace("/(tabs)/dashboard");
  }
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.canvas, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "800", color: tokens.color.ink, marginBottom: 8 }}>Rush Zone Control</Text>
      <Text style={{ color: tokens.color.secondary, marginBottom: 24 }}>Owner-approved access · Password + Super Key</Text>
      <View style={{ backgroundColor: tokens.color.surface, borderRadius: tokens.radius.card, padding: 16, borderWidth: 1, borderColor: tokens.color.border }}>
        {step === "email" && (
          <>
            <Text style={{ color: tokens.color.ink, marginBottom: 8 }}>Staff email</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="owner@rushzone.pk" autoCapitalize="none" keyboardType="email-address" placeholderTextColor={tokens.color.disabled} style={{ borderWidth: 1, borderColor: tokens.color.border, borderRadius: tokens.radius.input, padding: 12, color: tokens.color.ink }} />
            <Text style={{ color: tokens.color.ink, marginTop: 12, marginBottom: 8 }}>Password</Text>
            <TextInput value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry style={{ borderWidth: 1, borderColor: tokens.color.border, borderRadius: tokens.radius.input, padding: 12 }} />
            <Pressable onPress={handlePasswordLogin} disabled={loading} style={{ backgroundColor: tokens.color.primary, borderRadius: tokens.radius.button, padding: 14, alignItems: "center", marginTop: 16, opacity: loading ? 0.6 : 1 }}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700" }}>Sign In</Text>}
            </Pressable>
            <Text style={{ color: tokens.color.secondary, fontSize: 12, marginTop: 12 }}>This key is assigned and rotated only by the Rush Zone Owner. OTP will be enabled later.</Text>
          </>
        )}
        {step === "superkey" && (
          <>
            <Text style={{ color: tokens.color.ink, marginBottom: 8 }}>Owner-issued Admin Super Key</Text>
            <TextInput value={key} onChangeText={setKey} placeholder="RZ-XXXX-XXXX-XXXX" secureTextEntry autoCapitalize="characters" style={{ borderWidth: 1, borderColor: tokens.color.border, borderRadius: tokens.radius.input, padding: 12 }} />
            <Pressable onPress={verifyKey} disabled={loading} style={{ backgroundColor: tokens.color.ink, borderRadius: tokens.radius.button, padding: 14, alignItems: "center", marginTop: 16, opacity: loading ? 0.6 : 1 }}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700" }}>Verify Super Key</Text>}
            </Pressable>
            <Pressable onPress={() => setStep("email")} style={{ marginTop: 12, alignItems: "center" }}><Text style={{ color: tokens.color.primary }}>Back to login</Text></Pressable>
          </>
        )}
        {msg ? <Text style={{ color: tokens.color.danger, marginTop: 12, textAlign: "center" }}>{msg}</Text> : null}
      </View>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}><SunsetStripe /></View>
    </View>
  );
}
