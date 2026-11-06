import { z } from "zod";

import { FAMILIES } from "#shared/domain/deadlines";

export const AlertParameters = z.object({
  reference: z.string().trim().min(1).max(64),
  family: z.enum(FAMILIES),
});

export const TreatmentBody = z.object({
  comment: z.string().trim().min(1, "Indiquez ce qui a été décidé").max(2000),
});
