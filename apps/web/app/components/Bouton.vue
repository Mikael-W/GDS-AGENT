<script setup lang="ts">
type Variante = "primaire" | "contour" | "secondaire";
type Taille = "normal" | "petit";

const props = withDefaults(
  defineProps<{
    variante?: Variante;
    taille?: Taille;
    type?: "button" | "submit";
    disabled?: boolean;
  }>(),
  { variante: "primaire", taille: "normal", type: "button", disabled: false },
);

const styles: Record<Variante, string> = {
  primaire: "bg-primary text-primary-foreground hover:bg-primary/90",
  contour: "border border-input bg-background hover:bg-secondary",
  secondaire: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
};

const tailles: Record<Taille, string> = {
  normal: "h-9 px-4 py-2",
  petit: "h-8 px-3",
};
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled"
    :class="[
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
      styles[props.variante],
      tailles[props.taille],
    ]"
  >
    <slot />
  </button>
</template>
