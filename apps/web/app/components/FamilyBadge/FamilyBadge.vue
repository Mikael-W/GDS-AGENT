<script setup lang="ts">
import { FAMILY_LABELS } from "#shared/domain/alerts";
import type { FamilyBadgeProps } from "./types/FamilyBadge";

defineProps<FamilyBadgeProps>();
</script>

<template>
  <span :class="['etiquette', `etiquette--${urgency}`]">{{ FAMILY_LABELS[family] }}</span>
</template>

<style scoped>
.etiquette {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.etiquette--retard {
  background: var(--retard);
  color: var(--retard-foreground);
}

.etiquette--attention {
  background: var(--attention);
  color: var(--attention-foreground);
}

.etiquette--information {
  background: var(--information);
  color: var(--information-foreground);
}
</style>
