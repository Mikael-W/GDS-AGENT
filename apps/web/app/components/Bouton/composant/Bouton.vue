<script setup lang="ts">
import type { PropsBouton } from "../types/Bouton";

const props = withDefaults(defineProps<PropsBouton>(), {
  variante: "primaire",
  taille: "normal",
  type: "button",
  disabled: false,
});
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled"
    :class="['bouton', `bouton--${props.variante}`, `bouton--${props.taille}`]"
  >
    <slot />
  </button>
</template>

<style scoped>
.bouton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid transparent;
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s;
}

.bouton:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.bouton:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.bouton--primaire {
  background: var(--primary);
  color: var(--primary-foreground);
}

.bouton--primaire:hover {
  background: var(--primary-survol);
}

.bouton--contour {
  border-color: var(--input);
  background: var(--surface);
  color: var(--foreground);
}

.bouton--contour:hover {
  background: var(--muted);
}

.bouton--secondaire {
  background: var(--muted);
  color: var(--foreground-doux);
}

.bouton--secondaire:hover {
  background: var(--border);
}

.bouton--normal {
  height: 2.5rem;
  padding: 0 1rem;
}

.bouton--petit {
  height: 2rem;
  padding: 0 0.75rem;
}
</style>
