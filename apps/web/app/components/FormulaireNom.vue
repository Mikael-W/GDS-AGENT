<script setup lang="ts">
const { nomInitial } = defineProps<{ nomInitial: string }>();
const emit = defineEmits<{ enregistre: [] }>();

const nom = ref(nomInitial);
const enCours = ref(false);
const erreur = ref<string | null>(null);
const enregistre = ref(false);

async function envoyer() {
  erreur.value = null;
  enregistre.value = false;
  enCours.value = true;
  try {
    await $fetch("/api/compte/renommer", { method: "POST", body: { nom: nom.value } });
    enregistre.value = true;
    emit("enregistre");
  } catch (e) {
    const message = e instanceof Error ? e.message : "Enregistrement impossible";
    erreur.value = message.replace(/^.*: /, "");
  } finally {
    enCours.value = false;
  }
}
</script>

<template>
  <form class="formulaire" @submit.prevent="envoyer">
    <label for="nom" class="discret">Nom affiché</label>
    <div class="ligne">
      <input id="nom" v-model="nom" name="nom" class="champ" />
      <Bouton type="submit" variante="secondaire" :disabled="enCours">Enregistrer</Bouton>
    </div>
    <p v-if="erreur" role="alert" class="erreur">{{ erreur }}</p>
    <p v-else-if="enregistre" class="discret">Enregistré.</p>
  </form>
</template>

<style scoped>
.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ligne {
  display: flex;
  gap: 0.5rem;
}

.champ {
  flex: 1;
  height: 2.5rem;
  padding: 0 0.75rem;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--foreground);
}

.champ:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.erreur {
  color: var(--destructive);
}
</style>
