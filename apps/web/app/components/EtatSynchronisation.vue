<script setup lang="ts">
import { type EtatFraicheur, fraicheur } from "~/domaine/fraicheur";

const { data } = await useFetch<{ termineeLe: string | null }>("/api/synchronisation/derniere", {
  key: "derniere-synchronisation",
  default: () => ({ termineeLe: null }),
});

const etat = computed(() =>
  fraicheur(data.value.termineeLe ? new Date(data.value.termineeLe) : null, new Date()),
);

const styles: Record<EtatFraicheur, string> = {
  conforme: "bg-conforme text-conforme-foreground",
  attention: "bg-attention text-attention-foreground",
  retard: "bg-retard text-retard-foreground",
};
</script>

<template>
  <div :class="['rounded-petit px-3 py-2.5', styles[etat.etat]]">
    <p class="text-xs font-semibold">{{ etat.titre }}</p>
    <p class="text-[0.8125rem]">{{ etat.detail }}</p>
  </div>
</template>
