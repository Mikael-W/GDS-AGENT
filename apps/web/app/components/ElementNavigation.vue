<script setup lang="ts">
defineProps<{ libelle: string; route: string; compteur?: number }>();
</script>

<template>
  <NuxtLink v-slot="{ href, navigate, isActive }" :to="route" custom>
    <a
      :href="href"
      :aria-current="isActive ? 'page' : undefined"
      :class="[
        'flex min-h-11 items-center gap-3 rounded-petit px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring',
        isActive
          ? 'bg-primary-tenu font-semibold text-primary'
          : 'text-foreground-doux hover:bg-muted',
      ]"
      @click="navigate"
    >
      <span
        aria-hidden="true"
        :class="['size-2 shrink-0 rounded-full', isActive ? 'bg-primary' : 'bg-puce-inactive']"
      />
      <span class="flex-1">{{ libelle }}</span>
      <span
        v-if="compteur !== undefined"
        class="rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground"
      >
        {{ compteur }}
      </span>
    </a>
  </NuxtLink>
</template>
