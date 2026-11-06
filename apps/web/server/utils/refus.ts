export function refuser(statusCode: number, message: string): never {
  throw createError({ statusCode, data: { message } });
}
