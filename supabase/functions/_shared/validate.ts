// _shared/validate.ts — zod schemas + helpers

import { z } from "https://esm.sh/zod@3.23.8";

export const uuidSchema = z.string().uuid();
export const coinAmountSchema = z.number().int().positive().max(1_000_000_000);
export const emailSchema = z.string().email().max(254);
export const phoneE164Schema = z.string().regex(/^\+[1-9]\d{7,14}$/, "E.164 format required, e.g. +923001234567");
export const ffUidSchema = z.string().min(5).max(32);

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const res = schema.safeParse(data);
  if (!res.success) {
    const msg = res.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: msg, retryable: false } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  return res.data;
}

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const tournamentCreateSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
  mode: z.enum(["solo", "duo", "squad", "custom"]),
  map: z.string().max(50).optional(),
  rounds: z.number().int().min(1).max(20).default(1),
  capacity: z.number().int().min(2).max(500),
  entry_fee: z.number().int().min(0),
  prize_pool: z.number().int().min(0),
  prize_distribution: z.array(z.any()).default([]),
  score_rules: z.record(z.any()).default({}),
  rules_text: z.string().max(5000).optional(),
  reg_open_at: z.string().datetime().optional(),
  reg_close_at: z.string().datetime().optional(),
  match_start_at: z.string().datetime().optional(),
  room_release_at: z.string().datetime().optional(),
  is_preset: z.boolean().optional(),
  preset_key: z.string().optional(),
  free_slot_enabled: z.boolean().optional(),
  free_slot_trigger: z.enum(["slots_full", "match_start"]).optional(),
});
