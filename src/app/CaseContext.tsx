/**
 * Selected-case state. Holds the currently-loaded case id, persisted to localStorage so a reload
 * keeps the investigator's context. There is no fabricated default: until a case is chosen the
 * value is null and case-scoped views render an honest "select a case" state.
 */
import * as React from 'react';

const STORAGE_KEY = 'qaif.selectedCaseId';

interface CaseContextValue {
  caseId: number | null;
  setCaseId: (id: number | null) => void;
}

const CaseContext = React.createContext<CaseContextValue | null>(null);

function readStored(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function CaseProvider({ children }: { children: React.ReactNode }) {
  const [caseId, setCaseIdState] = React.useState<number | null>(readStored);

  const setCaseId = React.useCallback((id: number | null) => {
    setCaseIdState(id);
    try {
      if (id === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // Persistence is a convenience, not a requirement.
    }
  }, []);

  const value = React.useMemo(() => ({ caseId, setCaseId }), [caseId, setCaseId]);
  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSelectedCase(): CaseContextValue {
  const ctx = React.useContext(CaseContext);
  if (!ctx) throw new Error('useSelectedCase must be used within a CaseProvider');
  return ctx;
}
