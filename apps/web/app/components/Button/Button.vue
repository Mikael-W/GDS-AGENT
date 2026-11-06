<script setup lang="ts">
import type { ButtonProps } from "./types/Button";

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: "primary",
  size: "normal",
  type: "button",
  disabled: false,
});
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled"
    :class="['button', `button--${props.variant}`, `button--${props.size}`]"
  >
    <slot />
  </button>
</template>

<style scoped>
.button {
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

.button:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.button:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.button--primary {
  background: var(--primary);
  color: var(--primary-foreground);
}

.button--primary:hover {
  background: var(--primary-survol);
}

.button--outline {
  border-color: var(--input);
  background: var(--surface);
  color: var(--foreground);
}

.button--outline:hover {
  background: var(--muted);
}

.button--secondary {
  background: var(--muted);
  color: var(--foreground-doux);
}

.button--secondary:hover {
  background: var(--border);
}

.button--normal {
  height: 2.5rem;
  padding: 0 1rem;
}

.button--small {
  height: 2rem;
  padding: 0 0.75rem;
}
</style>
