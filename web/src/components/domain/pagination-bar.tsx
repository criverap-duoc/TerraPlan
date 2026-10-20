import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { pageRangeLabel, totalPages } from '@/lib/pagination';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ page, pageSize, total, onPageChange }: PaginationBarProps) {
  const lastPage = totalPages({ page, pageSize, total });
  const label = pageRangeLabel({ page, pageSize, total });

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="font-mono text-xs tabular-nums text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Anterior
        </Button>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {page} / {lastPage}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          Siguiente
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
