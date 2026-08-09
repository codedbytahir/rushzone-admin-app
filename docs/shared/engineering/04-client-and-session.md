# Engineering 04 — Mobile Supabase Client & Session Security

Both apps initialize Supabase with the same secure pattern. This corrects an earlier draft that used plain AsyncStorage — AsyncStorage is **not encrypted** and is unacceptable for a financial/admin app.

## 1. Dependencies
```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage \
  react-native-url-polyfill expo-secure-store expo-crypto
```
- `expo-secure-store` stores a 256-bit AES key in the Android Keystore / iOS Keychain.
- `expo-crypto` generates the random key.
- `AsyncStorage` holds only the **encrypted** Supabase session (the session JWT can exceed SecureStore's 2048-byte value limit, which is why it's encrypted and stored in AsyncStorage).
- `react-native-url-polyfill` is required for React Native.

## 2. LargeSecureStore adapter
```ts
// src/lib/LargeSecureStore.ts
import * as SecureStore from 'expo-secure-store'
import * as aesjs from 'aes-js'
import 'react-native-get-random-values'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Crypto from 'expo-crypto'

const ENC_KEY = 'rz.session.enc'

class LargeSecureStore {
  private async _getKey(): Promise<Uint8Array> {
    const stored = await SecureStore.getItemAsync(ENC_KEY)
    if (stored) return aesjs.utils.hex.toBytes(stored)
    const key = Crypto.getRandomBytes(32)
    await SecureStore.setItemAsync(ENC_KEY, aesjs.utils.hex.fromBytes(key))
    return key
  }
  async getItem(k: string) {
    try {
      const key = await this._getKey()
      const enc = await AsyncStorage.getItem(k)
      if (!enc) return null
      const ctr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1))
      return aesjs.utils.utf8.fromBytes(ctr.decrypt(aesjs.utils.hex.toBytes(enc)))
    } catch { return null }
  }
  async setItem(k: string, v: string) {
    const key = await this._getKey()
    const ctr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1))
    const enc = aesjs.utils.hex.fromBytes(ctr.encrypt(aesjs.utils.utf8.toBytes(v)))
    await AsyncStorage.setItem(k, enc)
  }
  async removeItem(k: string) { await AsyncStorage.removeItem(k) }
}
export default LargeSecureStore
```
(Pattern from Supabase's official React Native auth guide.)

## 3. Supabase client
```ts
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto'
import { createClient, processLock } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'
import LargeSecureStore from './LargeSecureStore'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, // sb_publishable_… (NOT legacy anon)
  {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  }
)

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  })
}
```

## 4. Rules
- The only Supabase key in either app is `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`).
- Never place `sb_secret_…`, `service_role`, or any legacy `eyJ...` JWT in an app repo, `.env`, or bundle.
- On sign-out, call `supabase.auth.signOut()` and clear local storage.
- On auth state change, route to login/main app; handle `TOKEN_REFRESHED` and `SIGNED_OUT`.
- For the Admin app: after a successful email OTP, require the Super Key in a second step; never persist the Super Key on device. Hold it in memory only for the session and re-prompt for sensitive actions.
- Use `expo-secure-store` with appropriate accessibility options (e.g., after first unlock on Android).

## 5. TypeScript types
- Generate `database.types.ts` from the backend repo:
  `supabase gen types typescript --project-ref <ref> > types/database.types.ts`.
- The backend repo owns and versions the types; each app repo consumes a tagged release (or copies the generated file) so apps compile against the exact schema they target.
- Instantiate `createClient<Database>(...)` with the generated types for end-to-end type safety.

## 6. Networking
- All fetch calls to Edge Functions go through a wrapper that adds `Authorization`, `Idempotency-Key`, and a request id; handles 401 by refreshing; normalizes errors into the standard shape.
- Never use the Supabase URL with a legacy key header. If a library asks for "anon key", supply the **publishable** key — it is a drop-in replacement.

## 7. App config
- Configure `expo-secure-store` plugin in `app.json`.
- Set Android `usesCleartextTraffic=false`.
- Set URL schemes for deep links (`rushzone://`, `rushzonecontrol://`) used by notifications.
