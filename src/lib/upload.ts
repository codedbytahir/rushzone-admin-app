import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "./supabase";
type Bucket = "tournament-thumbnails" | "banners" | "avatars" | "payment-proofs" | "admin-docs";
export async function compressImage(uri: string, maxWidth = 1024, quality = 0.8) {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: maxWidth } }], { compress: quality, format: ImageManipulator.SaveFormat.WEBP });
  return result.uri;
}
export async function uploadToBucket(bucket: Bucket, path: string, uri: string, contentType = "image/webp") {
  const res = await fetch(uri);
  const blob = await res.blob();
  const { data: session } = await supabase.auth.getSession();
  const { data, error } = await supabase.storage.from(bucket).upload(path, blob as any, { contentType, upsert: true });
  if (error) throw error;
  return data.path;
}
export async function getSignedUrl(bucket: Bucket, path: string, expires = 300) {
  const { data: session } = await supabase.auth.getSession();
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/storage-signed-url?bucket=${bucket}&path=${encodeURIComponent(path)}&expires=${expires}`, { headers: { Authorization: `Bearer ${session.session?.access_token}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "signed url failed");
  return json.url as string;
}
