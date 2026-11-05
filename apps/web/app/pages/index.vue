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
  <main class="connexion">
    <h1 class="titre-page">Suivi des marchés</h1>
    <p class="discret">
      Les échéances, les avances et les révisions de prix des marchés de la Communauté
      de communes, rassemblées au même endroit.
    </p>
    <Bouton @click="aller('/auth/keycloak')">Se connecter</Bouton>
    <div v-if="estDev" class="dev">
      <span>Connexion rapide de développement (hors production) :</span>
      <div class="dev__actions">
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

<style scoped>
.connexion {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
  max-width: 42rem;
  margin: 0 auto;
  padding: 4rem 1rem;
}

.dev {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  color: var(--muted-foreground);
}

.dev__actions {
  display: flex;
  gap: 0.5rem;
}
</style>
