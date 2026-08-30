import { Check, Pin } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useBoard } from './BoardContext';
import { type PinSeed } from './boardModel';

/**
 * "Send to board" — pins a case artifact (evidence / finding / entity) onto the investigation board
 * as a REFERENCE. It is pure client analysis: it writes nothing to the backend, never seals evidence
 * or custody. Once pinned it shows an "On board" confirmation and disables (the board dedupes by
 * reference anyway). Available to any role — a no-write surface needs no gating.
 */
export function SendToBoardButton({
  seed,
  iconOnly = false,
}: {
  seed: PinSeed;
  iconOnly?: boolean;
}) {
  const { pin, isPinned } = useBoard();
  const pinned = isPinned(seed.refId);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pinned}
      onClick={() => pin(seed)}
      title={pinned ? 'Already on the board' : 'Send to investigation board'}
      aria-label={pinned ? 'On board' : 'Send to board'}
    >
      {pinned ? <Check aria-hidden /> : <Pin aria-hidden />}
      {!iconOnly && (pinned ? 'On board' : 'Send to board')}
    </Button>
  );
}
