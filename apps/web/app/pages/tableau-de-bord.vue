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
  <div class="page">
    <section class="accueil">
      <h1 class="titre-page">Bonjour {{ nomAffiche }}.</h1>
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
        <Bouton variante="secondaire" :disabled="synchroEnCours" @click="synchroniserCiril">
          {{ synchroEnCours ? "Synchronisation en cours..." : "Lancer la synchronisation" }}
        </Bouton>
      </div>
      <p v-if="synchroErreur" role="alert" class="erreur">
        {{ synchroErreur }}
      </p>
      <dl v-if="synchro" class="resultats">
        <div>
          <dt class="discret">Reçus</dt>
          <dd class="valeur">{{ synchro.recus }}</dd>
        </div>
        <div>
          <dt class="discret">Insérés</dt>
          <dd class="valeur">{{ synchro.inseres }}</dd>
        </div>
        <div>
          <dt class="discret">Mis à jour</dt>
          <dd class="valeur">{{ synchro.misAJour }}</dd>
        </div>
        <div>
          <dt class="discret">Inchangés</dt>
          <dd class="valeur">{{ synchro.inchanges }}</dd>
        </div>
      </dl>
    </section>

    <section class="bloc">
      <h2 class="titre-carte">Mon compte</h2>
      <FormulaireNom :nom-initial="compte?.nom ?? ''" @enregistre="refresh" />
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
