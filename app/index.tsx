// app/index.tsx — Splash / Security Check -> decides route (login vs dashboard)
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { tokens } from '../src/theme/tokens';
import { SunsetStripe } from '../components/SunsetStripe';

export default function Index() {
  const [session, setSession] = useState<any>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
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
  if (!session) return <Redirect href="/(auth)/login" as const />;

  // TODO: after OTP + Super Key verification, session will carry admin claims. For now, send to dashboard stub
  return <Redirect href="/(tabs)/dashboard" as const />;
}
