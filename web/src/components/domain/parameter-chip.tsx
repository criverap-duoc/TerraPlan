import { Badge } from '@/components/ui/badge';

interface ParameterChipProps {
  code: string;
  name: string;
  unitCode?: string;
}

export function ParameterChip({ code, name, unitCode }: ParameterChipProps) {
  return (
    <Badge variant="secondary" className="gap-1.5 font-normal">
      <span className="font-mono text-xs font-medium tabular-nums">{code}</span>
      <span>{name}</span>
      {unitCode ? <span className="text-muted-foreground">{unitCode}</span> : null}
    </Badge>
  );
}
