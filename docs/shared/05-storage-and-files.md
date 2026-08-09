# 05 — Storage & Files

Supabase Storage buckets. Files are never stored as blobs in Postgres — only object paths/metadata live in the DB.

| Bucket | Visibility | Contents | Max size | Notes |
|---|---|---|---|---|
| `tournament-thumbnails` | Public / CDN | Cover art uploaded by admin | 1 MB | Resize/compress, WebP preferred |
| `banners` | Public / CDN | Home slider banners | 500 KB | 9:16-ish or per design; admin-managed |
| `avatars` | Public-read / owner-write | Player avatars | 500 KB | Resize/compress client + server |
| `payment-proofs` | **Private** | Top-up proof if ever required (v1 uses reference only) | 2 MB | Short-lived signed URLs; finance roles only |
| `admin-docs` | **Private** | Admin-uploaded operational documents | 5 MB | Signed URLs; audit every access |

## Rules
- The mobile apps upload only to `avatars` (players) and never directly to private buckets.
- Admins upload covers/banners from Control; private bucket access goes through Edge Functions that check permissions and return short-lived signed URLs (e.g., 5-minute expiry).
- Validate MIME type and extension; reject executables. Scan for malware where feasible.
- Enforce per-file size limits in Storage policies and client checks.
- Object keys are namespaced, e.g. `avatars/<profile-id>/<uuid>.webp`.
- Deleting a user removes DB references; object cleanup runs as a scheduled job (never synchronous blocking).
