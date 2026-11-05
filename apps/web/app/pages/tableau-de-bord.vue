<script setup lang="ts">
import type { Utilisateur } from "@projet/db/schema";

definePageMeta({ middleware: "connecte" });

useHead({ title: "Tableau de bord - Suivi des marchés" });

const { user } = useUserSession();
const { public: config } = useRuntimeConfig();
const estDev = config.environnement === "dev";

const { data: compte, refresh } = await useFetch<Utilisateur | null>("/api/me", {
  default: () => null,
});

const nomAffiche = computed(
  () => compte.value?.nom ?? compte.value?.email ?? user.value?.nom ?? "à vous",
);

type ResultatSynchro = {
  pointAcces: string;
  recus: number;
  inseres: number;
  misAJour: number;
  inchanges: number;
};

const synchro = ref<ResultatSynchro | null>(null);
const synchroEnCours = ref(false);
const synchroErreur = ref<string | null>(null);

async function synchroniserCiril() {
  synchroErreur.value = null;
  synchro.value = null;
  synchroEnCours.value = true;
  try {
    synchro.value = await $fetch<ResultatSynchro>("/api/dev/synchroniser", { method: "POST" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Synchronisation impossible";
    synchroErreur.value = message.replace(/^.*: /, "");
  } finally {
    synchroEnCours.value = false;
  }
}
</script>

<template>
  <main class="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
    <section class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">Bonjour {{ nomAffiche }}.</h1>
      <p class="text-muted-foreground">
        Aucune donnée n'est encore remontée de CIRIL. Les écrans de suivi arrivent avec
        la synchronisation.
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article class="rounded-md border p-4">
        <h2 class="font-semibold">Échéances</h2>
        <p class="text-sm text-muted-foreground">
          Reconductions, garanties, réceptions, points à six mois, bons de commande. Visible dès
          la première synchronisation CIRIL.
        </p>
      </article>
      <article class="rounded-md border p-4">
        <h2 class="font-semibold">Avances</h2>
        <p class="text-sm text-muted-foreground">
          Suivi des avances versées et des remboursements à amorcer. À venir.
        </p>
      </article>
      <article class="rounded-md border p-4">
        <h2 class="font-semibold">Révisions de prix</h2>
        <p class="text-sm text-muted-foreground">
          Indices INSEE appliqués aux marchés révisables. À venir.
        </p>
      </article>
    </section>

    <section v-if="estDev" class="flex flex-col gap-3 border-t pt-6">
      <h2 class="font-semibold">Synchronisation CIRIL (dev)</h2>
      <p class="text-sm text-muted-foreground">
        Récupère les contrats de la sandbox et les insère dans la table marchés.
      </p>
      <div>
        <Bouton variante="secondaire" :disabled="synchroEnCours" @click="synchroniserCiril">
          {{ synchroEnCours ? "Synchronisation en cours..." : "Lancer la synchronisation" }}
        </Bouton>
      </div>
      <p v-if="synchroErreur" role="alert" class="text-sm text-destructive">
        {{ synchroErreur }}
      </p>
      <dl v-if="synchro" class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt class="text-muted-foreground">Reçus</dt>
          <dd class="font-semibold">{{ synchro.recus }}</dd>
        </div>
        <div>
          <dt class="text-muted-foreground">Insérés</dt>
          <dd class="font-semibold">{{ synchro.inseres }}</dd>
        </div>
        <div>
          <dt class="text-muted-foreground">Mis à jour</dt>
          <dd class="font-semibold">{{ synchro.misAJour }}</dd>
        </div>
        <div>
          <dt class="text-muted-foreground">Inchangés</dt>
          <dd class="font-semibold">{{ synchro.inchanges }}</dd>
        </div>
      </dl>
    </section>

    <section class="flex flex-col gap-3 border-t pt-6">
      <h2 class="font-semibold">Mon compte</h2>
      <FormulaireNom :nom-initial="compte?.nom ?? ''" @enregistre="refresh" />
    </section>
  </main>
</template>
