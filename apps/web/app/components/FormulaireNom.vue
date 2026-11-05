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
  <form class="flex flex-col gap-2" @submit.prevent="envoyer">
    <label for="nom" class="text-sm text-muted-foreground">Nom affiché</label>
    <div class="flex gap-2">
      <input
        id="nom"
        v-model="nom"
        name="nom"
        class="h-9 flex-1 rounded-md border border-input bg-background px-3"
      />
      <Bouton type="submit" variante="secondaire" :disabled="enCours">Enregistrer</Bouton>
    </div>
    <p v-if="erreur" role="alert" class="text-sm text-destructive">{{ erreur }}</p>
    <p v-else-if="enregistre" class="text-sm text-muted-foreground">Enregistré.</p>
  </form>
</template>
