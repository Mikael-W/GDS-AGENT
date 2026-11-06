<script setup lang="ts">
import type { NameFormEvents, NameFormProps } from "./types/NameForm";

const { initialName } = defineProps<NameFormProps>();
const emit = defineEmits<NameFormEvents>();

const name = ref(initialName);
const busy = ref(false);
const error = ref<string | null>(null);
const saved = ref(false);

async function submit() {
  error.value = null;
  saved.value = false;
  busy.value = true;
  try {
    await $fetch("/api/compte/renommer", { method: "POST", body: { name: name.value } });
    saved.value = true;
    emit("saved");
  } catch (e) {
    error.value = serverMessage(e, "Enregistrement impossible");
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="formulaire" @submit.prevent="submit">
    <label for="nom" class="discret">Nom affiché</label>
    <div class="ligne">
      <input id="nom" v-model="name" name="nom" class="champ" />
      <Button type="submit" variant="secondary" :disabled="busy">Enregistrer</Button>
    </div>
    <p v-if="error" role="alert" class="erreur">{{ error }}</p>
    <p v-else-if="saved" class="discret">Enregistré.</p>
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
  color: var(--retard-foreground);
}
</style>
