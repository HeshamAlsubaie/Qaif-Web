import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  /** Stable row id, so React keys survive sorting. */
  getRowId?: (row: TData, index: number) => string;
  initialSorting?: SortingState;
}

/**
 * A thin, headless TanStack Table wrapper styled for the console (navy surfaces, sortable headers).
 * Purely presentational chrome — it carries no forensic meaning; tier/AI/integrity are expressed by
 * the cells it renders (badges), never by the table itself.
 */
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  initialSorting = [],
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(getRowId ? { getRowId } : {}),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-border">
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className="whitespace-nowrap bg-surface-2 px-3 py-2.5 text-left text-micro font-semibold uppercase tracking-wider text-muted-foreground first:rounded-tl-md last:rounded-tr-md"
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <ChevronUp className="size-3.5" aria-hidden />
                        ) : sorted === 'desc' ? (
                          <ChevronDown className="size-3.5" aria-hidden />
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-border/50 transition-colors hover:bg-surface-2/60',
                i % 2 === 1 && 'bg-surface-1/40',
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2.5 align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
