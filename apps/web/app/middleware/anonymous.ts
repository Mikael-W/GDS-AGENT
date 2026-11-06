export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession();
  if (loggedIn.value) return navigateTo("/tableau-de-bord");
});
