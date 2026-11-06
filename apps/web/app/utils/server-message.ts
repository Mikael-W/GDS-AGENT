import { z } from "zod";

const ServerError = z.object({
  statusCode: z.number().int().min(400).max(499),
  data: z.object({ data: z.object({ message: z.string().min(1) }) }),
});

export function serverMessage(error: unknown, parDefaut: string): string {
  const lue = ServerError.safeParse(error);
  return lue.success ? lue.data.data.data.message : parDefaut;
}
