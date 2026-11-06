<script setup lang="ts">
import type { User } from "@projet/db/schema";

definePageMeta({ middleware: "authenticated" });

useHead({ title: "Tableau de bord - Suivi des marchés" });

const { user } = useUserSession();
const { public: config } = useRuntimeConfig();
const estDev = config.environnement === "dev";

const { data: account, refresh } = await useFetch<User | null>("/api/me", {
  default: () => null,
});

const displayName = computed(
  () => account.value?.name ?? account.value?.email ?? user.value?.name ?? "à vous",
);

type SynchronizationResult = {
  accessPoint: string;
  received: number;
  inserted: number;
  updated: number;
  unchanged: number;
};

const synchronization = ref<SynchronizationResult | null>(null);
const synchronizationRunning = ref(false);
const synchronizationError = ref<string | null>(null);

async function synchronizeCiril() {
  synchronizationError.value = null;
  synchronization.value = null;
  synchronizationRunning.value = true;
  try {
    synchronization.value = await $fetch<SynchronizationResult>("/api/dev/synchroniser", { method: "POST" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Synchronisation impossible";
    synchronizationError.value = message.replace(/^.*: /, "");
  } finally {
    synchronizationRunning.value = false;
  }
}
</script>

<template>
  <div class="page">
    <section class="accueil">
      <h1 class="titre-page">Bonjour {{ displayName }}.</h1>
      <p class="discret">
        Aucune donnée n'est encore remontée de CIRIL. Les écrans de suivi arrivent avec
        la synchronisation.
      </p>
    </section>

    <section class="cartes">
      <article class="carte">
        <h2 class="titre-carte">Échéances</h2>
        <p class="discret">
          Reconductions, garanties, réceptions, points à six mois, bons de commande. Visible dès
          la première synchronisation CIRIL.
        </p>
      </article>
      <article class="carte">
        <h2 class="titre-carte">Avances</h2>
        <p class="discret">
          Suivi des avances versées et des remboursements à amorcer. À venir.
        </p>
      </article>
      <article class="carte">
        <h2 class="titre-carte">Révisions de prix</h2>
        <p class="discret">
          Indices INSEE appliqués aux marchés révisables. À venir.
        </p>
      </article>
    </section>

    <section v-if="estDev" class="bloc">
      <h2 class="titre-carte">Synchronisation CIRIL (dev)</h2>
      <p class="discret">
        Récupère les contrats de la sandbox et les insère dans la table marchés.
      </p>
      <div>
        <Button variant="secondary" :disabled="synchronizationRunning" @click="synchronizeCiril">
          {{ synchronizationRunning ? "Synchronisation en cours..." : "Lancer la synchronisation" }}
        </Button>
      </div>
      <p v-if="synchronizationError" role="alert" class="erreur">
        {{ synchronizationError }}
      </p>
      <dl v-if="synchronization" class="resultats">
        <div>
          <dt class="discret">Reçus</dt>
          <dd class="valeur">{{ synchronization.received }}</dd>
        </div>
        <div>
          <dt class="discret">Insérés</dt>
          <dd class="valeur">{{ synchronization.inserted }}</dd>
        </div>
        <div>
          <dt class="discret">Mis à jour</dt>
          <dd class="valeur">{{ synchronization.updated }}</dd>
        </div>
        <div>
          <dt class="discret">Inchangés</dt>
          <dd class="valeur">{{ synchronization.unchanged }}</dd>
        </div>
      </dl>
    </section>

    <section class="bloc">
      <h2 class="titre-carte">Mon compte</h2>
      <NameForm :initial-name="account?.name ?? ''" @saved="refresh" />
    </section>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.accueil {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cartes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem;
}

.carte {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-carte);
  background: var(--surface);
}

.bloc {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.erreur {
  color: var(--retard-foreground);
}

.resultats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.5rem;
}

.valeur {
  font-weight: 600;
}
</style>
