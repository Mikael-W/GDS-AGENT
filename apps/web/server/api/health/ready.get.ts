export default defineEventHandler(async (event) => {
  const { ok, body } = await verifier();
  setResponseStatus(event, ok ? 200 : 503);
  return body;
});
