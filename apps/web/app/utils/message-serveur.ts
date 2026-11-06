import { z } from "zod";

const ErreurServeur = z.object({
  statusCode: z.number().int().min(400).max(499),
  data: z.object({ data: z.object({ message: z.string().min(1) }) }),
});

export function messageServeur(erreur: unknown, parDefaut: string): string {
  const lue = ErreurServeur.safeParse(erreur);
  return lue.success ? lue.data.data.data.message : parDefaut;
}
