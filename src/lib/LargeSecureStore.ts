import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as aesjs from "aes-js";
import "react-native-get-random-values";
import * as Crypto from "expo-crypto";
const ENC_KEY = "rz.session.enc.v1";
export class LargeSecureStore {
  private async _getKey(): Promise<Uint8Array> {
    if (Platform.OS === "web") return new Uint8Array(32);
    const stored = await SecureStore.getItemAsync(ENC_KEY);
    if (stored) return aesjs.utils.hex.toBytes(stored);
    const random = await Crypto.getRandomBytesAsync(32);
    const hex = aesjs.utils.hex.fromBytes(random);
    await SecureStore.setItemAsync(ENC_KEY, hex, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK } as any);
    return random;
  }
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    try {
      const enc = await AsyncStorage.getItem(key);
      if (!enc) return null;
      const aesKey = await this._getKey();
      const ctr = new aesjs.ModeOfOperation.ctr(aesKey, new aesjs.Counter(1));
      const decrypted = ctr.decrypt(aesjs.utils.hex.toBytes(enc));
      return aesjs.utils.utf8.fromBytes(decrypted);
    } catch { return null; }
  }
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
    const aesKey = await this._getKey();
    const ctr = new aesjs.ModeOfOperation.ctr(aesKey, new aesjs.Counter(1));
    const encrypted = aesjs.utils.hex.fromBytes(ctr.encrypt(aesjs.utils.utf8.toBytes(value)));
    await AsyncStorage.setItem(key, encrypted);
  }
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}
export default LargeSecureStore;
