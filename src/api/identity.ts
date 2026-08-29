/**
 * The acting principal for the audited case writes (open-a-case, add-to-case, review).
 *
 * IAM STAND-IN (the single seam). These become the IAM headers the backend reads: `x-qaif-role`
 * (Viewer | Investigator) and `x-qaif-actor` (the analyst identity, R10). The backend FAIL-CLOSES to
 * Viewer when no/garbage role is sent, so a write MUST carry the Investigator role or it is rejected
 * 403 — the real security boundary lives there, not here.
 *
 * STAGE 4: the role is now REAL and user-selectable (see {@link ../app/RoleContext}). It is no longer
 * hardcoded — {@link roleHeaders} stamps whichever role the user is acting as, so a Viewer genuinely
 * sends `Viewer` and the backend 403s their writes (defense in depth). This module stays the ONE
 * place the header shape is defined; Stage 5 / real auth swaps it again without touching call sites.
 */

/** The two roles the platform gates on. Fail-closed default is Viewer (matches the backend). */
export type Role = 'Viewer' | 'Investigator';

/** The stand-in analyst identity recorded as the actor on writes (R10 provenance). */
export const ANALYST_ACTOR = 'analyst.hesham';

/**
 * The IAM stand-in headers for a write, stamped with the role the user is ACTUALLY acting as. A
 * Viewer sends `x-qaif-role: Viewer` (the backend then 403s the write); an Investigator sends
 * `Investigator`. The actor is the stand-in analyst identity until real auth lands.
 */
export function roleHeaders(role: Role): Record<string, string> {
  return { 'x-qaif-role': role, 'x-qaif-actor': ANALYST_ACTOR };
}
