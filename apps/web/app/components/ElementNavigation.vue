<script setup lang="ts">
defineProps<{ libelle: string; route: string }>();
</script>

<template>
  <NuxtLink v-slot="{ href, navigate, isActive }" :to="route" custom>
    <a
      :href="href"
      :aria-current="isActive ? 'page' : undefined"
      :class="['lien', { 'lien--actif': isActive }]"
      @click="navigate"
    >
      <span aria-hidden="true" :class="['puce', { 'puce--active': isActive }]" />
      <span class="libelle">{{ libelle }}</span>
    </a>
  </NuxtLink>
</template>

<style scoped>
.lien {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  border-radius: var(--radius-petit);
  color: var(--foreground-doux);
  text-decoration: none;
}

.lien:hover {
  background: var(--muted);
}

.lien:focus-visible {
  outline: 2px solid var(--ring);
}

.lien--actif,
.lien--actif:hover {
  background: var(--primary-tenu);
  color: var(--primary);
  font-weight: 600;
}

.puce {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--puce-inactive);
}

.puce--active {
  background: var(--primary);
}

.libelle {
  flex: 1;
}
</style>
