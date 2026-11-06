import { z } from "zod";

const ServerError = z.object({
  statusCode: z.number().int().min(400).max(499),
  data: z.object({ data: z.object({ message: z.string().min(1) }) }),
});

export function serverMessage(error: unknown, fallback: string): string {
  const parsed = ServerError.safeParse(error);
  return parsed.success ? parsed.data.data.data.message : fallback;
}
