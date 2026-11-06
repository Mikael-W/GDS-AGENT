<script setup lang="ts">
import type {
  EvenementsFormulaireTraitement,
  PropsFormulaireTraitement,
} from "../types/FormulaireTraitement";

const { racine } = defineProps<PropsFormulaireTraitement>();
const emit = defineEmits<EvenementsFormulaireTraitement>();

const commentaire = ref("");
const enCours = ref(false);
const echec = ref("");

async function traiter() {
  enCours.value = true;
  echec.value = "";
  try {
    await $fetch(`${racine}/traitement`, {
      method: "POST",
      body: { commentaire: commentaire.value },
    });
    emit("traite");
  } catch (e) {
    echec.value = messageServeur(
      e,
      "Le traitement n'a pas pu être enregistré. Réessayez dans un instant.",
    );
  } finally {
    enCours.value = false;
  }
}
</script>

<template>
  <form class="formulaire" @submit.prevent="traiter">
    <p class="discret">Une alerte non traitée reste visible et revient dans les rappels.</p>
    <label for="commentaire" class="etiquette-champ">Commentaire</label>
    <textarea
      id="commentaire"
      v-model="commentaire"
      class="zone"
      rows="3"
      required
      placeholder="Ce qui a été décidé, et par qui"
    />
    <p v-if="echec" role="alert" class="erreur">{{ echec }}</p>
    <div>
      <Bouton type="submit" :disabled="enCours || commentaire.trim() === ''">
        Marquer comme traité
      </Bouton>
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
