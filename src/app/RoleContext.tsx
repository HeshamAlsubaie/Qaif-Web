/**
 * Acting-role state — the ONE source of truth for the role. It drives BOTH the IAM header sent on
 * writes (via {@link ../api/identity.roleHeaders}) AND whether the UI shows write actions at all.
 *
 * The Viewer/Investigator dev toggle was removed from the shell, so the effective role is now sourced
 * from the {@link EFFECTIVE_ROLE} config constant (fixed to Investigator) rather than a UI toggle /
 * localStorage — otherwise a stale ``Viewer`` from a prior session would silently kill every write.
 * ``setRole`` is kept so the context shape and the IAM seam are unchanged (Stage-5 auth swaps the
 * source again without touching call sites); nothing in the UI calls it while the toggle is gone.
 *
 * This is still a STAND-IN for real auth: the backend independently enforces the gate (Viewer → 403
 * on writes), so this is UX layered on real enforcement, never the boundary itself.
 */
import * as React from 'react';

import type { Role } from '@/api/identity';
import { EFFECTIVE_ROLE } from '@/app/config';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  /** Convenience: true when the current role may perform the audited writes. */
  canWrite: boolean;
}

const RoleContext = React.createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  // Sourced from the config constant, not a toggle: the effective role is fixed to Investigator so
  // Investigator-only actions stay reachable with the switcher removed.
  const [role, setRoleState] = React.useState<Role>(EFFECTIVE_ROLE);

  const setRole = React.useCallback((next: Role) => setRoleState(next), []);

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
