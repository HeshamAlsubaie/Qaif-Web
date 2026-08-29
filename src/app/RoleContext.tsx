/**
 * Acting-role state. Holds the role the user is currently acting as (Viewer | Investigator),
 * persisted to localStorage so a reload keeps it. This is the ONE source of truth for the role: it
 * drives BOTH the IAM header sent on writes (via {@link ../api/identity.roleHeaders}) AND whether the
 * UI shows write actions at all. The default is Viewer — fail-closed, matching the backend's posture
 * — so nothing writes until the user deliberately acts as an Investigator.
 *
 * This is a Stage-4 STAND-IN for real auth: switching is a trivial dev toggle in the shell, not a
 * login. The backend still independently enforces the gate (Viewer → 403 on writes), so hiding the
 * actions here is UX honesty layered on real enforcement, never the boundary itself.
 */
import * as React from 'react';

import type { Role } from '@/api/identity';

const STORAGE_KEY = 'qaif.actingRole';
const DEFAULT_ROLE: Role = 'Viewer';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  /** Convenience: true when the current role may perform the audited writes. */
  canWrite: boolean;
}

const RoleContext = React.createContext<RoleContextValue | null>(null);

function readStored(): Role {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'Investigator' ? 'Investigator' : DEFAULT_ROLE;
  } catch {
    return DEFAULT_ROLE;
  }
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = React.useState<Role>(readStored);

  const setRole = React.useCallback((next: Role) => {
    setRoleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is a convenience, not a requirement.
    }
  }, []);

  const value = React.useMemo(
    () => ({ role, setRole, canWrite: role === 'Investigator' }),
    [role, setRole],
  );
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRole(): RoleContextValue {
  const ctx = React.useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}
