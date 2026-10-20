import type { ComponentType, ReactNode } from 'react';

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card px-4 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p className="text-base font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
