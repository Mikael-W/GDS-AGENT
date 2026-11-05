<script setup lang="ts">
import { pluriel } from "#shared/domaine/affichage";
import { type AlerteListe, LIBELLES_FAMILLE, libelleEcheance, lienAlerte, urgence } from "#shared/domaine/alertes";
import { FAMILLES, type Famille } from "#shared/domaine/echeances";
import {
  FAMILLE_TOUTES,
  filtrerParFamille,
  grouperParMois,
  jourDuMois,
  syntheseEcheancier,
} from "#shared/domaine/echeancier";

definePageMeta({ middleware: "connecte" });

useHead({ title: "Échéancier - Suivi des marchés" });

const { data: echeances, error } = await useFetch<AlerteListe[]>("/api/echeancier", {
  default: () => [],
});

const famille = ref<Famille | typeof FAMILLE_TOUTES>(FAMILLE_TOUTES);

const resume = computed(() => syntheseEcheancier(echeances.value));
const groupes = computed(() =>
  grouperParMois(filtrerParFamille(echeances.value, { famille: famille.value })),
);
</script>

<template>
  <div class="page">
    <header class="entete">
      <div>
        <h1 class="titre-page">Échéancier</h1>
        <p class="discret">Ce qui tombe dans les six prochains mois, mois par mois.</p>
      </div>
      <div>
        <label for="famille" class="visuellement-cache">Famille d'alerte</label>
        <select id="famille" v-model="famille" class="filtre">
          <option :value="FAMILLE_TOUTES">Toutes les familles</option>
          <option v-for="f in FAMILLES" :key="f" :value="f">{{ LIBELLES_FAMILLE[f] }}</option>
        </select>
      </div>
    </header>

    <p v-if="error" role="alert" class="erreur">
      L'échéancier n'a pas pu être chargé. Réessayez dans un instant.
    </p>

    <template v-else>
      <section aria-label="Chiffres clés" class="chiffres">
        <CarteChiffre libelle="Échéances dépassées" :valeur="String(resume.depassees)" />
        <CarteChiffre libelle="Sous 30 jours" :valeur="String(resume.sousTrenteJours)" />
      </section>

      <p v-if="groupes.length === 0" class="vide">Aucune échéance ne correspond à ce choix.</p>

      <section v-for="groupe in groupes" :key="groupe.mois" class="mois" :aria-label="groupe.libelle">
        <header :class="['mois__entete', { 'mois__entete--retard': groupe.contientDepassee }]">
          <h2 class="titre-carte">{{ groupe.libelle }}</h2>
          <p class="discret">{{ pluriel(groupe.alertes.length, "échéance") }}</p>
        </header>
        <ul class="mois__liste">
          <li v-for="a in groupe.alertes" :key="`${a.reference}-${a.famille}`">
            <NuxtLink :to="lienAlerte(a)" class="ligne">
              <span :class="['jour', `jour--${urgence(a)}`]">{{ jourDuMois(a) }}</span>
              <EtiquetteFamille :famille="a.famille" :urgence="urgence(a)" />
              <span class="marche">
                <span class="objet">{{ a.objet ?? "Sans objet" }}</span>
                <span class="reference">
                  {{ a.reference }}<template v-if="a.service"> · {{ a.service }}</template>
                </span>
              </span>
              <span :class="['delai', `delai--${urgence(a)}`]">{{ libelleEcheance(a.joursRestants) }}</span>
            </NuxtLink>
          </li>
        </ul>
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

.entete {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.filtre {
  height: 2.5rem;
  padding: 0 0.75rem;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--foreground);
}

.filtre:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.erreur {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-petit);
  background: var(--retard);
  color: var(--retard-foreground);
}

.chiffres {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 1rem;
}

.vide {
  color: var(--muted-foreground);
}

.mois {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-carte);
  background: var(--surface);
}

.mois__entete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--border-interne);
}

.mois__entete--retard {
  background: var(--retard);
}

.mois__liste {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mois__liste li + li {
  border-top: 1px solid var(--border-interne);
}

.ligne {
  display: grid;
  grid-template-columns: 2.5rem auto 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  color: inherit;
  text-decoration: none;
}

.ligne:hover {
  background: var(--muted);
}

.ligne:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: -2px;
}

.jour {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--foreground);
}

.jour--retard {
  color: var(--retard-foreground);
}

.marche {
  display: flex;
  flex-direction: column;
}

.objet {
  font-weight: 600;
  color: var(--foreground);
}

.reference {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.delai {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  text-align: right;
}

.delai--attention {
  color: var(--attention-foreground);
}

.delai--retard {
  color: var(--retard-foreground);
}

@media (max-width: 40rem) {
  .ligne {
    grid-template-columns: 2.5rem 1fr;
  }
}
</style>
