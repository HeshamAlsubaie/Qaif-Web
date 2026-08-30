/**
 * The timeline as a PLAIN TABLE — clean, no color coding, no badges, no legend, no prose. It renders
 * the same reconciled `/timeline` data the vertical view did, on the same UTC basis, but its entire
 * job is to NOT lie about order:
 *
 *   - Rows are fixed in UTC order (the reconciliation basis, R8). There is no column sorting, so the
 *     axis can never be reordered by a non-UTC key.
 *   - Events the backend refuses to sequence (a `tie` / `precision_overlap` cluster) share a Group id
 *     and are bound by a rowspan bracket + a neutral shared-background block into ONE unordered set.
 *     Their Ambiguity cell reads TIE / INDETERMINATE ORDER, so a reader sees co-occurrence, never a
 *     top-to-bottom sequence. Row position inside a group carries no meaning.
 *   - A provisional instant (assumed tz / clock skew) is flagged in the Time-basis column, in text.
 *
 * With ~1371 rows the table paginates (never splitting a group across a page) so it stays responsive.
 */
import * as React from 'react';

import { cn } from '@/lib/utils';

import {
  eventKindLabel,
  rowAmbiguityLabels,
  timeBasis,
  toTimelineRows,
  type EntityResolver,
  type TimelineLayout,
  type TimelineRow,
} from './timelineModel';

const ROWS_PER_PAGE = 50;

/** UTC parts (the axis is explicitly UTC; a local zone would contradict R8). */
function utcParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: '' };
  const date = d.toLocaleDateString('en-CA', { timeZone: 'UTC' }); // YYYY-MM-DD
  const time = d.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false });
  return { date, time };
}

/** Linked entities as compact plain text — resolved to real values where the graph has them. */
function entitiesText(ids: number[], resolver: EntityResolver): string {
  if (ids.length === 0) return '';
  return ids.map((id) => resolver(id)?.value ?? `#${id}`).join(', ');
}

/**
 * Break rows into pages of ~ROWS_PER_PAGE, but NEVER split a co-occurrence group across a page: a
 * page boundary is only allowed at a "unit end" (a singleton, or the last member of a group), so a
 * bracketed group is always rendered whole and its rowspan can never straddle two pages.
 */
function paginate(rows: TimelineRow[]): TimelineRow[][] {
  const pages: TimelineRow[][] = [];
  let current: TimelineRow[] = [];
  for (const row of rows) {
    current.push(row);
    const unitEnd = row.groupId === null || row.positionInGroup === row.groupSize - 1;
    if (current.length >= ROWS_PER_PAGE && unitEnd) {
      pages.push(current);
      current = [];
    }
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

const HEADERS = [
  'Group',
  'Timestamp (UTC)',
  'Event',
  'Source',
  'Entities',
  'Ambiguity',
  'Time basis',
];

function TimelineRowCells({ row, resolver }: { row: TimelineRow; resolver: EntityResolver }) {
  const { node, groupId } = row;
  const { event } = node;
  const { date, time } = utcParts(event.utc);
  const entities = entitiesText(event.entity_ids, resolver);
  const ambiguity = rowAmbiguityLabels(node);
  const grouped = groupId !== null;
  const firstOfGroup = grouped && row.positionInGroup === 0;

  return (
    <tr
      className={cn(
        'border-b border-border/50 align-top',
        grouped && 'bg-surface-2/40',
        firstOfGroup && 'border-t border-border/60',
      )}
    >
      {/* Group cell — the binder. For a co-occurrence group it spans all members (rowSpan) with a
          vertical rule (border-r), so the rows read as ONE unordered set; row order is not asserted. */}
      {grouped ? (
        firstOfGroup ? (
          <td
            rowSpan={row.groupSize}
            className="border-r-2 border-muted-foreground/40 px-3 py-2 text-center align-middle"
          >
            <span className="font-mono text-caption font-medium text-foreground">{groupId}</span>
          </td>
        ) : null
      ) : (
        <td className="px-3 py-2 text-center text-muted-foreground">—</td>
      )}

      <td className="whitespace-nowrap px-3 py-2 font-mono text-caption tabular-nums">
        <span className="text-muted-foreground">{date}</span>{' '}
        <span className="text-foreground">{time}</span>
      </td>

      <td className="px-3 py-2 text-foreground">{eventKindLabel(event.event_kind)}</td>

      <td className="whitespace-nowrap px-3 py-2 font-mono text-caption text-muted-foreground">
        {event.source_module}
      </td>

      <td className="px-3 py-2">
        {entities ? (
          <span className="block max-w-[24rem] truncate font-mono text-caption" title={entities}>
            {entities}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      <td className="whitespace-nowrap px-3 py-2 text-caption text-foreground">
        {ambiguity.length > 0 ? ambiguity.join(' · ') : <span className="text-muted-foreground">—</span>}
      </td>

      <td className="whitespace-nowrap px-3 py-2 text-caption text-foreground">
        {timeBasis(node)}
      </td>
    </tr>
  );
}

export function TimelineTable({
  layout,
  resolver,
}: {
  layout: TimelineLayout;
  resolver: EntityResolver;
}) {
  const rows = React.useMemo(() => toTimelineRows(layout), [layout]);
  const pages = React.useMemo(() => paginate(rows), [rows]);
  const [page, setPage] = React.useState(0);

  // Keep the page index valid if the data (and thus page count) changes underneath us.
  React.useEffect(() => {
    setPage((p) => Math.min(p, pages.length - 1));
  }, [pages.length]);

  const groupCount = React.useMemo(
    () => new Set(rows.map((r) => r.groupId).filter((g): g is string => g !== null)).size,
    [rows],
  );

  const current = pages[Math.min(page, pages.length - 1)];
  const total = rows.length;
  const firstRow = pages.slice(0, page).reduce((n, p) => n + p.length, 0) + 1;
  const lastRow = firstRow + current.length - 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
        <span className="tabular-nums">
          {total} {total === 1 ? 'event' : 'events'} · UTC order
          {groupCount > 0 && (
            <>
              {' '}
              · {groupCount} co-occurrence {groupCount === 1 ? 'group' : 'groups'}
            </>
          )}
        </span>
        {total > 0 && (
          <span className="tabular-nums">
            Rows {firstRow}–{lastRow} of {total}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-body">
          <thead>
            <tr className="border-b border-border">
              {HEADERS.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap bg-surface-2 px-3 py-2.5 text-left text-micro font-semibold uppercase tracking-wider text-muted-foreground"
                  scope="col"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.map((row) => (
              <TimelineRowCells key={row.node.event.event_key} row={row} resolver={resolver} />
            ))}
          </tbody>
        </table>
      </div>

      {pages.length > 1 && (
        <div className="flex items-center justify-end gap-3 text-caption">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-md border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-surface-3 disabled:pointer-events-none disabled:opacity-40"
          >
            Previous
          </button>
          <span className="tabular-nums text-muted-foreground">
            Page {page + 1} of {pages.length}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
            disabled={page >= pages.length - 1}
            className="rounded-md border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-surface-3 disabled:pointer-events-none disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
