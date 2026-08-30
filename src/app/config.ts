/**
 * App-level dev config constants.
 */
import type { Role } from '@/api/identity';

/**
 * dev stopgap: role fixed to Investigator until IAM lands — Investigator-only actions must stay
 * reachable.
 *
 * The Viewer/Investigator toggle was removed from the top bar; with no way to switch, the effective
 * role is sourced from THIS constant so every write (open-a-case, add-to-case, review) stays
 * reachable. RoleContext + the IAM header seam (api/identity) are unchanged — only the SOURCE of the
 * role moved from a UI toggle to this constant. When real auth (Stage 5) lands, the role comes from
 * the session and this constant is deleted.
 */
export const EFFECTIVE_ROLE: Role = 'Investigator';
