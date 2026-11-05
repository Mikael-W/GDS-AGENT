import { z } from "zod";

import { FAMILLES } from "#shared/domaine/echeances";

export const ParametresAlerte = z.object({
  reference: z.string().trim().min(1).max(64),
  famille: z.enum(FAMILLES),
});

export const CorpsTraitement = z.object({
  commentaire: z.string().trim().min(1, "Indiquez ce qui a été décidé").max(2000),
});
