import { z } from 'zod';

export const newCampaignSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,40}$/, 'Usá letras, números y guiones (3 a 40 caracteres).'),
  siteId: z.string().min(1, 'Elegí un sitio.'),
  parameterCodes: z.array(z.string()).min(1, 'Elegí al menos un parámetro.'),
  notes: z.string().max(1000, 'El máximo es 1000 caracteres.').optional(),
});

export type NewCampaignValues = z.infer<typeof newCampaignSchema>;
