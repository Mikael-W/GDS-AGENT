<script setup lang="ts">
const { loggedIn } = useUserSession();
</script>

<template>
  <header class="border-b">
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
      <span class="font-semibold">Suivi des marchés</span>
      <form v-if="loggedIn" action="/auth/deconnexion" method="post">
        <Bouton type="submit" variante="contour" taille="petit">Se déconnecter</Bouton>
      </form>
    </div>
  </header>
</template>
