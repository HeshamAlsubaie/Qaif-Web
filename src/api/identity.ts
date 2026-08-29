/**
 * The acting principal for the audited case writes (open-a-case, add-to-case).
 *
 * STAGE 3 STAND-IN. These are sent as the IAM headers the backend reads: `x-qaif-role`
 * (Viewer | Investigator) and `x-qaif-actor` (the analyst identity, R10). The backend FAIL-CLOSES
 * to Viewer when no role is sent, so a write MUST carry the Investigator role or it is rejected 403.
 *
 * The role/actor are hardcoded here for now; Stage 4 makes them real and user-selectable. Every
 * write routes through {@link investigatorHeaders}, so only this module changes when that lands —
 * the endpoints, hooks, and views never hardcode a role or actor themselves.
 */

/** The stand-in analyst identity recorded as the actor on writes (R10 provenance). */
export const ANALYST_ACTOR = 'analyst.hesham';

/** The IAM stand-in headers for an Investigator write. Stage 4 replaces the constant values. */
export function investigatorHeaders(): Record<string, string> {
  return { 'x-qaif-role': 'Investigator', 'x-qaif-actor': ANALYST_ACTOR };
}
