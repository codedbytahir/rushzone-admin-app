// Minimal ambient types so `tsc` can validate edge function syntax/logic.
declare namespace Deno {
  function serve(handler: (req: Request) => Promise<Response> | Response): void;
  namespace env {
    function get(key: string): string | undefined;
  }
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.0";
declare module "https://esm.sh/zod@3.23.8";
declare module "https://esm.sh/bcryptjs@2.4.3";
declare module "https://esm.sh/*";
