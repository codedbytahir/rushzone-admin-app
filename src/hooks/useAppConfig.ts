import { useEffect, useState } from "react";
type Policies = { terms: string; privacy: string; tournament_rules: string; wallet: string; rewards: string };
type AppConfig = { policies: Policies; landing_page_url: string; home_page_url: string; about_app_url: string; whatsapp_support_url: string; support_email: string; announcement: { text: string; link: string; active: boolean }; featured_tournament_id: string | null; versions: any; maintenance: { enabled: boolean; message: string }; cash_operations_enabled: boolean; social: any; stores: any };
export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/app-config`).then((r) => r.json()).then(setConfig).catch(() => null).finally(()=> setLoading(false));
  }, []);
  return { config, loading };
}
