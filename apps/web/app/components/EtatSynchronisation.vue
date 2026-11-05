<script setup lang="ts">
import { fraicheur } from "~/domaine/fraicheur";

const RAFRAICHISSEMENT_MS = 60_000;

const { data, error, refresh } = await useFetch<{ termineeLe: string | null }>(
  "/api/synchronisation/derniere",
  { key: "derniere-synchronisation", default: () => ({ termineeLe: null }) },
);

const maintenant = useState("maintenant", () => Date.now());

const etat = computed(() =>
  fraicheur(
    data.value.termineeLe ? new Date(data.value.termineeLe) : null,
    new Date(maintenant.value),
  ),
);

let minuteur: ReturnType<typeof setInterval>;
onMounted(() => {
  minuteur = setInterval(() => {
    maintenant.value = Date.now();
    refresh();
  }, RAFRAICHISSEMENT_MS);
});
onUnmounted(() => clearInterval(minuteur));
</script>

<template>
  <div v-if="error" class="etat etat--attention">
    <p class="titre">Fraîcheur indisponible</p>
    <p class="detail">L'état des données n'a pas pu être lu.</p>
  </div>
  <div v-else :class="['etat', `etat--${etat.etat}`]">
    <p class="titre">{{ etat.titre }}</p>
    <p class="detail">{{ etat.detail }}</p>
  </div>
</template>

<style scoped>
.etat {
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-petit);
}

.etat--conforme {
  background: var(--conforme);
  color: var(--conforme-foreground);
}

.etat--attention {
  background: var(--attention);
  color: var(--attention-foreground);
}

.etat--retard {
  background: var(--retard);
  color: var(--retard-foreground);
}

.titre {
  font-size: 0.75rem;
  font-weight: 600;
}

.detail {
  font-size: 0.8125rem;
}
</style>
