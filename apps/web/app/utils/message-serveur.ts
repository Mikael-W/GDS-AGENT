import { z } from "zod";

const ErreurServeur = z.object({ statusMessage: z.string().min(1) });

export function messageServeur(erreur: unknown, parDefaut: string): string {
  const lue = ErreurServeur.safeParse(erreur);
  return lue.success ? lue.data.statusMessage : parDefaut;
}
