<script setup lang="ts">
import { formatDate, parisDay } from "#shared/domain/display";
import {
  type AlertDetail,
  FAMILY_LABELS,
  deadlineLabel,
  urgency,
} from "#shared/domain/alerts";
import { formatEuros } from "#shared/domain/contracts";

definePageMeta({ middleware: "authenticated" });

const route = useRoute();
const root = `/api/alertes/${encodeURIComponent(String(route.params.reference))}/${String(route.params.family)}`;

const { data: alert, error, refresh } = await useFetch<AlertDetail>(root);

useHead({ title: "Alerte - Suivi des marchés" });

const loadingMessage = computed(() =>
  error.value?.statusCode === 404
    ? "Cette alerte n'existe plus : son échéance a peut-être changé. Revenez à la liste des alertes."
    : "Cette alerte n'a pas pu être chargée. Réessayez dans un instant.",
);
</script>

<template>
  <div class="page">
    <NuxtLink to="/alertes" class="retour">Retour aux alertes</NuxtLink>

    <p v-if="error" role="alert" class="erreur">
      {{ loadingMessage }}
    </p>

    <template v-else-if="alert">
      <header class="entete">
        <div class="pastilles">
          <FamilyBadge :family="alert.family" :urgency="urgency(alert)" />
          <span class="statut">{{ alert.treatment ? "Traité" : "À traiter" }}</span>
          <span :class="['delai', `delai--${urgency(alert)}`]">
            Décision attendue : {{ deadlineLabel(alert.daysRemaining).toLowerCase() }}
          </span>
        </div>
        <h1 class="titre-page">{{ alert.subject ?? "Sans objet" }}</h1>
        <p class="discret">
          {{ alert.reference }} · {{ alert.service ?? "Service non renseigné" }} ·
          {{ alert.holder ?? "Titulaire non renseigné" }}
        </p>
      </header>

      <p :class="['bandeau', `bandeau--${urgency(alert)}`]">{{ alert.explanation }}</p>

      <div class="cartes">
        <section class="carte" aria-labelledby="declenche">
          <h2 id="declenche" class="titre-carte">Ce qui a déclenché l'alerte</h2>
          <p class="discret">Les données et la règle qui ont conduit à ce signalement.</p>
          <dl class="liste">
            <dt>Famille</dt>
            <dd>{{ FAMILY_LABELS[alert.family] }}</dd>
            <dt>Date limite de décision</dt>
            <dd>{{ formatDate(alert.deadlineOn) }}</dd>
          </dl>
        </section>

        <section class="carte" aria-labelledby="elements">
          <h2 id="elements" class="titre-carte">Éléments utiles à la décision</h2>
          <p class="discret">Lus dans CIRIL, chaque nuit.</p>
          <dl class="liste">
            <dt>Date de notification</dt>
            <dd>{{ formatDate(alert.notifiedOn) }}</dd>
            <dt>Début du marché</dt>
            <dd>{{ formatDate(alert.startsOn) }}</dd>
            <dt>Fin du marché</dt>
            <dd>{{ formatDate(alert.endsOn) }}</dd>
            <dt>Montant initial</dt>
            <dd>{{ formatEuros(alert.initialAmount) }}</dd>
            <dt>Marché soldé</dt>
            <dd>{{ alert.settled ? "Oui" : "Non" }}</dd>
          </dl>
        </section>
      </div>

      <section class="carte" aria-labelledby="traitement">
        <h2 id="traitement" class="titre-carte">Traitement</h2>

        <template v-if="alert.treatment">
          <p class="discret">
            Traitée le {{ formatDate(parisDay(new Date(alert.treatment.treatedAt))) }}.
          </p>
          <p class="decision">{{ alert.treatment.comment }}</p>
        </template>

        <TreatmentForm v-else :root="root" @handled="refresh" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.375rem;
}

.retour {
  align-self: flex-start;
  color: var(--primary);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
}

.retour:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.erreur {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-petit);
  background: var(--retard);
  color: var(--retard-foreground);
}

.pastilles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.statut {
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  background: var(--neutre);
  color: var(--neutre-foreground);
  font-size: 0.75rem;
  font-weight: 600;
}

.delai {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.delai--attention {
  color: var(--attention-foreground);
}

.delai--retard {
  color: var(--retard-foreground);
}

.bandeau {
  padding: 1rem 1.25rem;
  border-radius: var(--radius-carte);
}

.bandeau--retard {
  background: var(--retard);
  color: var(--retard-foreground);
}

.bandeau--attention {
  background: var(--attention);
  color: var(--attention-foreground);
}

.bandeau--information {
  background: var(--information);
  color: var(--information-foreground);
}

.cartes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
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

.liste {
  display: grid;
  grid-template-columns: minmax(8rem, 12rem) 1fr;
  gap: 0.625rem 1rem;
  margin-top: 0.5rem;
}

.liste dt {
  color: var(--muted-foreground);
}

.liste dd {
  font-weight: 600;
}

.decision {
  color: var(--foreground);
}

</style>
