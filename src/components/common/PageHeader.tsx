import * as React from 'react';

interface PageHeaderProps {
  kicker: string;
  title: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ kicker, title, sub, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-micro font-semibold uppercase tracking-wider text-primary">
          {kicker}
        </span>
        <h1 className="type-h2">{title}</h1>
        {sub && <span className="type-caption">{sub}</span>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
