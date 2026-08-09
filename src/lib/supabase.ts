// src/lib/supabase.ts — Secure Supabase client per 04-client-and-session.md
// App ships ONLY with publishable key (sb_publishable_...). Secret key lives only in Edge Functions.

import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import LargeSecureStore from './LargeSecureStore';
import type { Database } from '../../types/database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Set them in .env'
  );
}

// Single LargeSecureStore instance (shared key)
const largeSecureStore = new LargeSecureStore();

// Wrapper so supabase-js sees a synchronous-like storage (it awaits anyway)
const storageAdapter = {
  getItem: (k: string) => largeSecureStore.getItem(k),
  setItem: (k: string, v: string) => largeSecureStore.setItem(k, v),
  removeItem: (k: string) => largeSecureStore.removeItem(k),
};

export const supabase = createClient<Database>(url ?? 'https://placeholder.supabase.co', publishableKey ?? 'sb_publishable_placeholder', {
  auth: {
    storage: storageAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

// Auto-refresh on app foreground (native only)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

// Helper: call Edge Function with standard headers (Authorization + Idempotency-Key)
export async function callEdgeFunction<T>(
  functionName: string,
  opts: { method?: string; body?: any; idempotencyKey?: string; jwt?: string } = {}
): Promise<{ data: T | null; error: any }> {
  const jwt = opts.jwt ?? (await supabase.auth.getSession()).data.session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
  // Idempotent friendly: generate if mutating and not supplied
  // (caller should generate UUID v4 for financial/registration mutations)

  const functionUrl = `${url}/functions/v1/${functionName}`;
  const res = await fetch(functionUrl, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) return { data: null, error: json?.error ?? { code: 'UNKNOWN', message: `HTTP ${res.status}` } };
  return { data: json as T, error: null };
}
