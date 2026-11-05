<script setup lang="ts">
import { type EtatFraicheur, fraicheur } from "~/domaine/fraicheur";

const RAFRAICHISSEMENT_MS = 60_000;

const { data, error, refresh } = await useFetch<{ termineeLe: string | null }>(
  "/api/synchronisation/derniere",
  { key: "derniere-synchronisation", default: () => ({ termineeLe: null }) },
);

const maintenant = useState("maintenant", () => Date.now());

const etat = computed(() =>
  fraicheur(data.value.termineeLe ? new Date(data.value.termineeLe) : null, new Date(maintenant.value)),
);

let minuteur: ReturnType<typeof setInterval>;
onMounted(() => {
  minuteur = setInterval(() => {
    maintenant.value = Date.now();
    refresh();
  }, RAFRAICHISSEMENT_MS);
});
onUnmounted(() => clearInterval(minuteur));

const styles: Record<EtatFraicheur, string> = {
  conforme: "bg-conforme text-conforme-foreground",
  attention: "bg-attention text-attention-foreground",
  retard: "bg-retard text-retard-foreground",
};
</script>

<template>
  <div v-if="error" :class="['rounded-petit px-3 py-2.5', styles.attention]">
    <p class="text-xs font-semibold">Fraîcheur indisponible</p>
    <p class="text-[0.8125rem]">L'état des données n'a pas pu être lu.</p>
  </div>
  <div v-else :class="['rounded-petit px-3 py-2.5', styles[etat.etat]]">
    <p class="text-xs font-semibold">{{ etat.titre }}</p>
    <p class="text-[0.8125rem]">{{ etat.detail }}</p>
  </div>
</template>
