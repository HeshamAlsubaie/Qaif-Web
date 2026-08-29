import { Eye, ShieldCheck } from 'lucide-react';

import type { Role } from '@/api/identity';
import { useRole } from '@/app/RoleContext';
import { cn } from '@/lib/utils';

/**
 * The acting-role toggle — a Stage-4 STAND-IN for real auth, deliberately labelled as such ("Role
 * (dev)"). Switching updates the one {@link useRole} source of truth: it re-stamps the IAM header on
 * writes AND flips every write action's visibility across the UI. It is the ONLY way to become an
 * Investigator, so it lives in every shell (console + tools + landing) — otherwise a fresh Viewer
 * could never reach the writes.
 */

const ROLES: { value: Role; label: string; icon: typeof Eye }[] = [
  { value: 'Viewer', label: 'Viewer', icon: Eye },
  { value: 'Investigator', label: 'Investigator', icon: ShieldCheck },
];

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
        title="Stand-in for real authentication (Stage 5)"
      >
        Role (dev)
      </span>
      <div
        role="radiogroup"
        aria-label="Acting role"
        className="flex items-center gap-0.5 rounded-md border border-border bg-surface-0 p-0.5"
      >
        {ROLES.map(({ value, label, icon: Icon }) => {
          const active = role === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setRole(value)}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1 text-caption font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-3 hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
