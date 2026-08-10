// app/_layout.tsx — Expo Router root with auth gate
import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { tokens } from '../src/theme/tokens';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // restore session via LargeSecureStore inside supabase client
    supabase.auth.getSession().finally(() => setReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => {
      // route handling lives in app/index.tsx
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.color.surface },
        headerTintColor: tokens.color.ink,
        contentStyle: { backgroundColor: tokens.color.canvas },
      }}
      />
    </>
  );
}
