// src/lib/LargeSecureStore.ts
// Encrypted Supabase session adapter per docs/shared/engineering/04-client-and-session.md
// Pattern from Supabase official React Native guide: AES-256 key in SecureStore, encrypted session in AsyncStorage.
// Fixes the "plain AsyncStorage is not encrypted" issue.

import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const ENC_KEY = 'rz.session.enc.v1';

export class LargeSecureStore {
  private async _getKey(): Promise<Uint8Array> {
    const stored = await SecureStore.getItemAsync(ENC_KEY);
    if (stored) return aesjs.utils.hex.toBytes(stored);
    const random = await Crypto.getRandomBytesAsync(32);
    // Crypto.getRandomBytesAsync returns Uint8Array
    const hex = aesjs.utils.hex.fromBytes(random);
    await SecureStore.setItemAsync(ENC_KEY, hex, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    return random;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const enc = await AsyncStorage.getItem(key);
      if (!enc) return null;
      const aesKey = await this._getKey();
      // eslint-disable-next-line new-cap
      const ctr = new aesjs.ModeOfOperation.ctr(aesKey, new aesjs.Counter(1));
      const decrypted = ctr.decrypt(aesjs.utils.hex.toBytes(enc));
      return aesjs.utils.utf8.fromBytes(decrypted);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const aesKey = await this._getKey();
    // eslint-disable-next-line new-cap
    const ctr = new aesjs.ModeOfOperation.ctr(aesKey, new aesjs.Counter(1));
    const encrypted = aesjs.utils.hex.fromBytes(ctr.encrypt(aesjs.utils.utf8.toBytes(value)));
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}

export default LargeSecureStore;
