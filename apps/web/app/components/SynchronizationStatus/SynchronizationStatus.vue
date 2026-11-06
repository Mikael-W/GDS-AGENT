<script setup lang="ts">
import { freshness } from "~/domain/freshness";
import type { LastSynchronization } from "./types/SynchronizationStatus";

const RAFRAICHISSEMENT_MS = 60_000;

const { data, error, refresh } = await useFetch<LastSynchronization>(
  "/api/synchronisation/derniere",
  { key: "derniere-synchronisation", default: () => ({ finishedOn: null }) },
);

const now = useState("maintenant", () => Date.now());

const state = computed(() =>
  freshness(
    data.value.finishedOn ? new Date(data.value.finishedOn) : null,
    new Date(now.value),
  ),
);

let minuteur: ReturnType<typeof setInterval>;
onMounted(() => {
  minuteur = setInterval(() => {
    now.value = Date.now();
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
  <div v-else :class="['etat', `etat--${state.state}`]">
    <p class="titre">{{ state.title }}</p>
    <p class="detail">{{ state.details }}</p>
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
