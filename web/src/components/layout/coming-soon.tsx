import { Construction } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ComingSoonProps {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-info-soft text-info-soft-foreground">
            <Construction className="size-6" aria-hidden="true" />
          </span>
          <p className="text-base font-medium">Próximamente</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Esta pantalla se habilita en la siguiente entrega del MVP.
          </p>
          <Badge variant="secondary">En construcción</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
