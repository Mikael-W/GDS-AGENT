export default defineEventHandler(async (event) => {
  const { ok, body } = await verify();
  setResponseStatus(event, ok ? 200 : 503);
  return body;
});
