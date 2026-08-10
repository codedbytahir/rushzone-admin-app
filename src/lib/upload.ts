import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";
type Bucket = "tournament-thumbnails" | "banners" | "avatars" | "payment-proofs" | "admin-docs";
export async function compressImage(uri: string, maxWidth = 1024, quality = 0.8) {
  if (Platform.OS === "web") return uri;
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: maxWidth } }], { compress: quality, format: ImageManipulator.SaveFormat.WEBP });
  return result.uri;
}
export async function uploadToBucket(bucket: Bucket, path: string, uri: string, contentType = "image/webp") {
  const res = await fetch(uri);
  const blob = await res.blob();
  const { error, data } = await supabase.storage.from(bucket).upload(path, blob as any, { contentType, upsert: true });
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

export interface PickUploadResult {
  path: string;
  error?: string;
}

// Cross-platform "pick image → compress → upload to Supabase Storage".
// - Web: opens the browser file picker and uploads the raw file.
// - iOS/Android: asks for media-library permission, launches the image library
//   via expo-image-picker, compresses with expo-image-manipulator (WEBP),
//   then uploads. Returns the storage path ('' + error message on failure).
export async function pickAndUploadImage(opts: {
  bucket: Bucket;
  folder?: string;
  maxWidth?: number;
  quality?: number;
  maxBytes?: number;
}): Promise<PickUploadResult> {
  const folder = opts.folder ?? "uploads";
  const maxWidth = opts.maxWidth ?? 1024;
  const quality = opts.quality ?? 0.8;
  const maxBytes = opts.maxBytes ?? 5 * 1024 * 1024;
  const makePath = (name: string) => `${folder}/img_${Date.now()}_${name}`;

  if (Platform.OS === "web") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    const file: File | null = await new Promise((resolve) => {
      input.onchange = (e: any) => resolve(e.target?.files?.[0] ?? null);
      input.click();
    });
    if (!file) return { path: "", error: "No file selected" };
    if (file.size > maxBytes) return { path: "", error: `Image is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)` };
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "upload";
    const storagePath = makePath(cleanName);
    const { data, error } = await supabase.storage.from(opts.bucket).upload(storagePath, file, { upsert: true });
    if (error) return { path: "", error: error.message };
    return { path: data.path };
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { path: "", error: "Media library permission is required to pick an image" };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.9,
  });
  if (result.canceled || !result.assets?.[0]) return { path: "", error: "No image selected" };
  const uri = await compressImage(result.assets[0].uri, maxWidth, quality);
  const ext = uri.split(".").pop() ?? "webp";
  const storagePath = makePath(`upload.${ext}`);
  try {
    const path = await uploadToBucket(opts.bucket, storagePath, uri, `image/${ext === "jpg" ? "jpeg" : ext}`);
    return { path };
  } catch (err: any) {
    return { path: "", error: err?.message ?? "Upload failed" };
  }
}
