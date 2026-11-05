export default defineEventHandler(async (event) => {
  const { ok, corps } = await verifier();
  setResponseStatus(event, ok ? 200 : 503);
  return corps;
});
