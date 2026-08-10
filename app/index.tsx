// app/index.tsx — Splash / Security Check -> decides route (login vs dashboard)
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { api } from '../src/lib/api';
import { setAdminSession, clearAdminSession } from '../src/lib/adminSession';
import { tokens } from '../src/theme/tokens';
import { SunsetStripe } from '../components/SunsetStripe';

export default function Index() {
  const [session, setSession] = useState<any>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // Resolve permissions BEFORE redirecting so gated UI renders correctly on cold start.
        const res = await api.getMyAssignment();
        if (res.data) {
          setAdminSession({ assignmentId: res.data.assignment?.id, isOwner: !!res.data.is_owner, permissions: res.data.permissions ?? [] });
        }
      }
      setSession(data.session);
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) clearAdminSession();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!checked) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.color.primary} />
        <Text style={{ marginTop: 12, color: tokens.color.secondary }}>Rush Zone Control</Text>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><SunsetStripe /></View>
      </View>
    );
  }

  // If no session -> go to staff login (email OTP + Super Key)
  if (!session) return <Redirect href="/(auth)/login" />;

  return <Redirect href="/(tabs)/dashboard" />;
}
