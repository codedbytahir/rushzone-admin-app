import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "../../src/theme/tokens";
import { SunsetStripe } from "../../components/SunsetStripe";
import { supabase } from "../../src/lib/supabase";
import { api } from "../../src/lib/api";
import { setAdminSession } from "../../src/lib/adminSession";

type Role = "owner" | "employee";
type Step = "role" | "creds" | "superkey" | "request" | "requested" | "claimowner";

const ROLE_OPTIONS: { key: Role; label: string; sub: string; icon: any }[] = [
  { key: "owner", label: "Owner", sub: "Full control · approves staff", icon: "shield-checkmark-outline" },
  { key: "employee", label: "Employee", sub: "Owner-approved access · role-based permissions", icon: "people-outline" },
];

export default function Login() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("employee");
  const [step, setStep] = useState<Step>("creds");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [requestedRole, setRequestedRole] = useState("");
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [reqOk, setReqOk] = useState(false);

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

    // Resolve existing assignment state to decide next step
    const res = await api.getMyAssignment();
    if (res.data && res.data.assignment) {
      if (res.data.is_owner) { setStep("superkey"); return; }
      if (res.data.assignment.status === "pending") {
        setReqOk(true);
        setStep("requested");
        return;
      }
      if (res.data.assignment.status === "active") { setStep("superkey"); return; }
      // rejected/suspended -> allow requesting again
      setStep("request");
      return;
    }
    // No assignment yet
    if (role === "owner") {
      setStep("claimowner");
    } else {
      setStep("request");
    }
  }

  async function verifyKey() {
    if (key.length < 6) { setMsg("Enter Super Key"); return; }
    setLoading(true); setMsg("");
    const { data, error } = await api.verifySuperKey(key.trim());
    setLoading(false);
    if (error || !data?.ok) { setMsg((error as any)?.error?.message ?? "Unable to verify admin access."); return; }
    setAdminSession({ assignmentId: data.assignment_id, isOwner: !!data.is_owner, permissions: data.permissions ?? [] });
    router.replace("/(tabs)/dashboard");
  }

  async function requestAccess() {
    setLoading(true); setMsg("");
    const res = await api.requestAdminAccess(requestedRole.trim());
    setLoading(false);
    if (res.error) { setMsg(res.error.message ?? "Request failed"); return; }
    if (res.data?.already === 'throttled') { setMsg(res.data?.message ?? 'Try again in a few minutes.'); return; }
    setReqOk(true);
    setStep("requested");
  }

  async function claimOwner() {
    if (bootstrapSecret.length < 6) { setMsg("Enter the Owner bootstrap secret"); return; }
    setLoading(true); setMsg("");
    const res = await api.bootstrapOwner(bootstrapSecret.trim());
    setLoading(false);
    if (res?.error?.message) { setMsg(res.error.message); return; }
    if (res?.ok) {
      setMsg("");
      setStep("superkey");
    } else {
      setMsg("Unable to claim Owner access");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.canvas, padding: 24, justifyContent: "center" }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View style={{ maxWidth: 420, width: "100%", alignSelf: "center", gap: 10 }}>
          {/* Brand */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: tokens.color.primary, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="shield-checkmark" size={24} color={tokens.color.onPrimary} />
            </View>
            <View>
              <Text style={{ fontSize: 24, fontWeight: "800", color: tokens.color.ink, letterSpacing: -0.4 }}>Rush Zone Control</Text>
              <Text style={{ fontSize: 13, color: tokens.color.secondary }}>Owner-approved staff access</Text>
            </View>
          </View>

          {/* Role switcher */}
          <View style={{ flexDirection: "row", backgroundColor: tokens.color.surface, borderRadius: tokens.radius.button, borderWidth: 1, borderColor: tokens.color.border, padding: 4, gap: 4 }}>
            {ROLE_OPTIONS.map((r) => {
              const active = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => { setRole(r.key); setMsg(""); setStep("creds"); }}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: tokens.radius.button - 2, backgroundColor: active ? tokens.color.primary : "transparent" }}
                >
                  <Ionicons name={r.icon} size={15} color={active ? tokens.color.onPrimary : tokens.color.secondary} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: active ? tokens.color.onPrimary : tokens.color.secondary }}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ backgroundColor: tokens.color.surface, borderRadius: tokens.radius.card, padding: tokens.space.lg, borderWidth: 1, borderColor: tokens.color.border, gap: 4 }}>
            {step === "creds" && (
              <>
                <Text style={{ color: tokens.color.secondary, fontSize: 13, fontWeight: "600" }}>
                  {role === "owner" ? "OWNER EMAIL" : "EMPLOYEE EMAIL"}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="staff@rushzone.pk"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={tokens.color.disabled}
                  style={loginInput}
                />
                <Text style={{ color: tokens.color.secondary, fontSize: 13, fontWeight: "600", marginTop: 8 }}>PASSWORD</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  placeholderTextColor={tokens.color.disabled}
                  style={loginInput}
                />
                <Pressable
                  onPress={handlePasswordLogin}
                  disabled={loading}
                  style={{ backgroundColor: tokens.color.primary, borderRadius: tokens.radius.button, padding: 14, alignItems: "center", marginTop: 16, opacity: loading ? 0.6 : 1, flexDirection: "row", justifyContent: "center", gap: 8 }}
                >
                  {loading ? (
                    <ActivityIndicator color={tokens.color.onPrimary} />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={16} color={tokens.color.onPrimary} />
                      <Text style={{ color: tokens.color.onPrimary, fontWeight: "700" }}>Sign In</Text>
                    </>
                  )}
                </Pressable>
                <Text style={{ color: tokens.color.secondary, fontSize: 12, marginTop: 12, lineHeight: 18 }}>
                  {role === "owner"
                    ? "The Owner signs in with their unique Owner Super Key. Staff approvals and Super Key issuance happen here."
                    : "Employees verify with an Owner-issued Super Key. First time? Request access and the Owner will approve you."}
                </Text>
              </>
            )}

            {step === "superkey" && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name={role === "owner" ? "shield-checkmark-outline" : "key-outline"} size={18} color={tokens.color.primary} />
                  <Text style={{ color: tokens.color.secondary, fontSize: 13, fontWeight: "600" }}>
                    {role === "owner" ? "OWNER SUPER KEY" : "OWNER-ISSUED ADMIN SUPER KEY"}
                  </Text>
                </View>
                <TextInput
                  value={key}
                  onChangeText={setKey}
                  placeholder="RZ-XXXX-XXXX-XXXX"
                  secureTextEntry
                  autoCapitalize="none"
                  placeholderTextColor={tokens.color.disabled}
                  style={loginInput}
                />
                <Pressable
                  onPress={verifyKey}
                  disabled={loading}
                  style={{ backgroundColor: tokens.color.surfaceRaised, borderWidth: 1, borderColor: tokens.color.border, borderRadius: tokens.radius.button, padding: 14, alignItems: "center", marginTop: 16, opacity: loading ? 0.6 : 1, flexDirection: "row", justifyContent: "center", gap: 8 }}
                >
                  {loading ? (
                    <ActivityIndicator color={tokens.color.primary} />
                  ) : (
                    <>
                      <Ionicons name="key-outline" size={16} color={tokens.color.ink} />
                      <Text style={{ color: tokens.color.ink, fontWeight: "700" }}>Verify Super Key</Text>
                    </>
                  )}
                </Pressable>
                <Pressable onPress={() => setStep("creds")} style={{ marginTop: 12, alignItems: "center" }}>
                  <Text style={{ color: tokens.color.primary, fontWeight: "600" }}>Back to login</Text>
                </Pressable>
              </>
            )}

            {step === "claimowner" && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={tokens.color.primary} />
                  <Text style={{ color: tokens.color.secondary, fontSize: 13, fontWeight: "600" }}>CLAIM OWNER ACCESS</Text>
                </View>
                <Text style={{ color: tokens.color.secondary, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
                  No Owner is set up yet. Enter the one-time Owner bootstrap secret to register this account as the Owner.
                </Text>
                <TextInput
                  value={bootstrapSecret}
                  onChangeText={setBootstrapSecret}
                  placeholder="Owner bootstrap secret"
                  secureTextEntry
                  placeholderTextColor={tokens.color.disabled}
                  style={loginInput}
                />
                <Pressable
                  onPress={claimOwner}
                  disabled={loading}
                  style={{ backgroundColor: tokens.color.primary, borderRadius: tokens.radius.button, padding: 14, alignItems: "center", marginTop: 16, opacity: loading ? 0.6 : 1, flexDirection: "row", justifyContent: "center", gap: 8 }}
                >
                  {loading ? <ActivityIndicator color={tokens.color.onPrimary} /> : (
                    <>
                      <Ionicons name="shield-checkmark" size={16} color={tokens.color.onPrimary} />
                      <Text style={{ color: tokens.color.onPrimary, fontWeight: "700" }}>Claim Owner</Text>
                    </>
                  )}
                </Pressable>
                <Pressable onPress={() => setStep("creds")} style={{ marginTop: 12, alignItems: "center" }}>
                  <Text style={{ color: tokens.color.primary, fontWeight: "600" }}>Back</Text>
                </Pressable>
              </>
            )}

            {step === "request" && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="mail-unread-outline" size={18} color={tokens.color.primary} />
                  <Text style={{ color: tokens.color.secondary, fontSize: 13, fontWeight: "600" }}>REQUEST ADMIN ACCESS</Text>
                </View>
                <Text style={{ color: tokens.color.secondary, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
                  You don't have an Owner-issued Super Key yet. Tell the Owner what you'll be working on — they'll approve your request and hand you a Super Key.
                </Text>
                <Text style={{ color: tokens.color.secondary, fontSize: 13, fontWeight: "600", marginTop: 8 }}>WHAT WILL YOU HANDLE? (OPTIONAL)</Text>
                <TextInput
                  value={requestedRole}
                  onChangeText={setRequestedRole}
                  placeholder="e.g. Tournament management, withdrawals, content"
                  placeholderTextColor={tokens.color.disabled}
                  style={loginInput}
                />
                <Pressable
                  onPress={requestAccess}
                  disabled={loading}
                  style={{ backgroundColor: tokens.color.primary, borderRadius: tokens.radius.button, padding: 14, alignItems: "center", marginTop: 16, opacity: loading ? 0.6 : 1, flexDirection: "row", justifyContent: "center", gap: 8 }}
                >
                  {loading ? <ActivityIndicator color={tokens.color.onPrimary} /> : (
                    <>
                      <Ionicons name="send-outline" size={16} color={tokens.color.onPrimary} />
                      <Text style={{ color: tokens.color.onPrimary, fontWeight: "700" }}>Send Request to Owner</Text>
                    </>
                  )}
                </Pressable>
                <Pressable onPress={() => setStep("creds")} style={{ marginTop: 12, alignItems: "center" }}>
                  <Text style={{ color: tokens.color.primary, fontWeight: "600" }}>Back</Text>
                </Pressable>
              </>
            )}

            {step === "requested" && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={tokens.color.success} />
                  <Text style={{ color: tokens.color.ink, fontSize: 16, fontWeight: "800" }}>
                    {reqOk ? "Request sent!" : "Request pending"}
                  </Text>
                </View>
                <Text style={{ color: tokens.color.secondary, fontSize: 13, lineHeight: 19, marginTop: 6 }}>
                  {reqOk
                    ? "Your admin access request has been sent to the Owner. Once they approve it and hand you a Super Key, sign in again and enter the key."
                    : "You have a pending request. The Owner will approve it and issue you a Super Key."}
                </Text>
                <Pressable onPress={() => { setStep("creds"); setReqOk(false); }} style={{ marginTop: 14, alignItems: "center" }}>
                  <Text style={{ color: tokens.color.primary, fontWeight: "600" }}>Back to login</Text>
                </Pressable>
              </>
            )}

            {msg ? <Text style={{ color: tokens.color.danger, marginTop: 12, textAlign: "center", fontWeight: "600" }}>{msg}</Text> : null}
          </View>
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <SunsetStripe />
      </View>
    </View>
  );
}

const loginInput = {
  backgroundColor: tokens.color.canvas,
  borderWidth: 1,
  borderColor: tokens.color.border,
  borderRadius: tokens.radius.input,
  padding: 12,
  color: tokens.color.ink,
  fontSize: 14,
  marginTop: 6,
};
