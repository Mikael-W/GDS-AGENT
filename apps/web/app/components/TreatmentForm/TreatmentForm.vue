<script setup lang="ts">
import type {
  TreatmentFormEvents,
  TreatmentFormProps,
} from "./types/TreatmentForm";

const { root } = defineProps<TreatmentFormProps>();
const emit = defineEmits<TreatmentFormEvents>();

const comment = ref("");
const busy = ref(false);
const echec = ref("");

async function traiter() {
  busy.value = true;
  echec.value = "";
  try {
    await $fetch(`${root}/traitement`, {
      method: "POST",
      body: { comment: comment.value },
    });
    emit("handled");
  } catch (e) {
    echec.value = serverMessage(
      e,
      "Le traitement n'a pas pu être enregistré. Réessayez dans un instant.",
    );
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="formulaire" @submit.prevent="traiter">
    <p class="discret">Une alerte non traitée reste visible et revient dans les rappels.</p>
    <label for="commentaire" class="etiquette-champ">Commentaire</label>
    <textarea
      id="commentaire"
      v-model="comment"
      class="zone"
      rows="3"
      required
      placeholder="Ce qui a été décidé, et par qui"
    />
    <p v-if="echec" role="alert" class="erreur">{{ echec }}</p>
    <div>
      <Button type="submit" :disabled="busy || comment.trim() === ''">
        Marquer comme traité
      </Button>
    </div>
  </form>
</template>

<style scoped>
.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.etiquette-champ {
  font-size: 0.8125rem;
  font-weight: 600;
}

.zone {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--foreground);
  resize: vertical;
}

.zone:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.erreur {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-petit);
  background: var(--retard);
  color: var(--retard-foreground);
}
</style>
