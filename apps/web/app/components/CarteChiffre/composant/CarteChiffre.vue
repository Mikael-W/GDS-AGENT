<script setup lang="ts">
import type { PropsCarteChiffre } from "../types/CarteChiffre";

defineProps<PropsCarteChiffre>();
</script>

<template>
  <div class="carte">
    <p class="libelle">{{ libelle }}</p>
    <p class="valeur">{{ valeur }}</p>
  </div>
</template>

<style scoped>
.carte {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-carte);
  background: var(--surface);
}

.libelle {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}

.valeur {
  font-size: 1.9375rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.03em;
}
</style>
