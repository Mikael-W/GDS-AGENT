<script setup lang="ts">
definePageMeta({ layout: false, middleware: "anonyme" });

useHead({ title: "Connexion - Suivi des marchés" });

const { public: config } = useRuntimeConfig();
const estDev = config.environnement === "dev";

function aller(url: string) {
  window.location.href = url;
}
</script>

<template>
  <main class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
    <h1 class="text-titre-page">Suivi des marchés</h1>
    <p class="text-muted-foreground">
      Les échéances, les avances et les révisions de prix des marchés de la Communauté
      de communes, rassemblées au même endroit.
    </p>
    <Bouton @click="aller('/auth/keycloak')">Se connecter</Bouton>
    <div v-if="estDev" class="flex flex-col gap-2 border-t pt-4 text-sm text-muted-foreground">
      <span>Connexion rapide de développement (hors production) :</span>
      <div class="flex gap-2">
        <Bouton variante="contour" taille="petit" @click="aller('/auth/dev?comme=test')">
          Entrer comme test (membre)
        </Bouton>
        <Bouton variante="contour" taille="petit" @click="aller('/auth/dev?comme=admin')">
          Entrer comme admin (owner)
        </Bouton>
      </div>
    </div>
  </main>
</template>
