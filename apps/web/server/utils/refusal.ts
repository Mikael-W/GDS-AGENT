export function refuse(statusCode: number, message: string): never {
  throw createError({ statusCode, data: { message } });
}
