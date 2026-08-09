import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Policies = { terms: string; privacy: string; tournament_rules: string; wallet: string; rewards: string };
export type AppConfig = {
  policies: Policies;
  landing_page_url: string;
  home_page_url: string;
  about_app_url: string;
  whatsapp_support_url: string;
  support_email: string;
  announcement: { text: string; link: string; active: boolean };
  featured_tournament_id: string | null;
  versions: any;
  maintenance: { enabled: boolean; message: string };
  cash_operations_enabled: boolean;
  social: any;
  stores: any;
};

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAppConfig()
      .then((res) => {
        if (res.data && res.data.policies) {
          setConfig(res.data as AppConfig);
        } else if (res.data && (res.data as any).terms) {
          // Fallback if data root carries policies directly
          setConfig(res.data as any);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
