// src/hooks/useAdminSession.ts — reactive admin session for UI gating.
// Re-resolves the server-side assignment (is_owner + permissions) on mount and
// whenever the app regains focus, so permission-gated UI (Staff Admins section,
// New Tournament button, etc.) is correct even after a page reload / cold start.
import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { getAdminSession, setAdminSession, clearAdminSession, type AdminSession } from '../lib/adminSession';
import { api } from '../lib/api';

export function useAdminSession(): AdminSession {
  const [session, setSession] = useState<AdminSession>(getAdminSession());

  const refresh = useCallback(async () => {
    try {
      const res = await api.getMyAssignment();
      if (res.data && !res.error) {
        const next: AdminSession = {
          assignmentId: res.data.assignment?.id ?? res.data.assignment_id,
          isOwner: !!res.data.is_owner,
          permissions: res.data.permissions ?? [],
        };
        setAdminSession(next);
        setSession(next);
      } else if (res.error?.code === 'FORBIDDEN' || res.error?.code === 'UNAUTHORIZED') {
        clearAdminSession();
        setSession({ isOwner: false, permissions: [] });
      }
    } catch {
      // Keep whatever we have; the server still enforces everything.
    }
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return session;
}
