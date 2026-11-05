<script setup lang="ts">
import { paginer } from "#shared/domaine/affichage";
import {
  type AlerteListe,
  filtrer,
  formaterDate,
  LIBELLES_FAMILLE,
  libelleEcheance,
  lienAlerte,
  type PeriodeAlertes,
  services,
  synthese,
  titreListe,
  urgence,
  type VueAlertes,
} from "#shared/domaine/alertes";
import { FAMILLES, type Famille } from "#shared/domaine/echeances";

definePageMeta({ middleware: "connecte" });

useHead({ title: "Alertes - Suivi des marchés" });

const { data: alertes, error } = await useFetch<AlerteListe[]>("/api/alertes", {
  default: () => [],
});

const vue = ref<VueAlertes>("a_traiter");
const service = ref("");
const famille = ref<Famille | "">("");
const periode = ref<PeriodeAlertes>("toutes");
const numeroPage = ref(1);

watch([vue, service, famille, periode], () => {
  numeroPage.value = 1;
});

const resume = computed(() => synthese(alertes.value));
const servicesProposes = computed(() => services(alertes.value));
const page = computed(() =>
  paginer(
    filtrer(alertes.value, {
      vue: vue.value,
      service: service.value,
      famille: famille.value,
      periode: periode.value,
    }),
    numeroPage.value,
  ),
);

const precedente = () => {
  numeroPage.value = page.value.page - 1;
};
const suivante = () => {
  numeroPage.value = page.value.page + 1;
};
</script>

<template>
  <div class="page">
    <header>
      <h1 class="titre-page">Alertes</h1>
      <p class="discret">L'agent signale, vous décidez. Rien n'est écrit dans CIRIL.</p>
    </header>

    <p v-if="error" role="alert" class="erreur">
      Les alertes n'ont pas pu être chargées. Réessayez dans un instant.
    </p>

    <template v-else>
      <div class="onglets" role="group" aria-label="Vue des alertes">
        <button
          type="button"
          :class="['onglet', { 'onglet--actif': vue === 'a_traiter' }]"
          :aria-pressed="vue === 'a_traiter'"
          @click="vue = 'a_traiter'"
        >
          À traiter <span class="compte">{{ resume.aTraiter }}</span>
        </button>
        <button
          type="button"
          :class="['onglet', { 'onglet--actif': vue === 'depassees' }]"
          :aria-pressed="vue === 'depassees'"
          @click="vue = 'depassees'"
        >
          Dont dépassées <span class="compte">{{ resume.depassees }}</span>
        </button>
      </div>

      <section class="liste">
        <div class="liste__entete">
          <h2 class="titre-carte">{{ titreListe(vue, page.total) }}</h2>
          <label for="service" class="visuellement-cache">Service</label>
          <select id="service" v-model="service" class="filtre">
            <option value="">Tous les services</option>
            <option v-for="nom in servicesProposes" :key="nom" :value="nom">{{ nom }}</option>
          </select>
          <label for="periode" class="visuellement-cache">Période</label>
          <select id="periode" v-model="periode" class="filtre">
            <option value="toutes">Toutes les périodes</option>
            <option value="30">Dépassées ou sous 30 jours</option>
            <option value="90">Dépassées ou sous 90 jours</option>
          </select>
          <label for="famille" class="visuellement-cache">Type d'alerte</label>
          <select id="famille" v-model="famille" class="filtre">
            <option value="">Tous types d'alerte</option>
            <option v-for="f in FAMILLES" :key="f" :value="f">{{ LIBELLES_FAMILLE[f] }}</option>
          </select>
        </div>

        <div class="defilement">
          <table class="tableau">
            <caption class="visuellement-cache">Alertes d'échéance à traiter</caption>
            <thead>
              <tr>
                <th scope="col">Échéance</th>
                <th scope="col">Famille</th>
                <th scope="col">Marché</th>
                <th scope="col">Ce que l'agent a constaté</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in page.lignes" :key="`${a.reference}-${a.famille}`">
                <td>
                  <p class="echeance">{{ formaterDate(a.echeanceLe) }}</p>
                  <p :class="`delai delai--${urgence(a)}`">
                    {{ libelleEcheance(a.joursRestants) }}
                  </p>
                </td>
                <td><EtiquetteFamille :famille="a.famille" :urgence="urgence(a)" /></td>
                <td>
                  <p class="marche">{{ a.objet ?? "Sans objet" }}</p>
                  <p class="reference">{{ a.reference }}</p>
                </td>
                <td>{{ a.explication }}</td>
                <td>
                  <NuxtLink :to="lienAlerte(a)" class="examiner">
                    Examiner<span class="visuellement-cache"> l'alerte du marché {{ a.reference }}</span>
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="page.total === 0" class="vide">Aucune alerte ne correspond à ces critères.</p>

        <footer class="liste__pied">
          <p class="discret" aria-live="polite">
            Alertes affichées : {{ page.lignes.length }} sur {{ page.total }}
          </p>
          <nav aria-label="Pagination" class="pagination">
            <Bouton variante="contour" taille="petit" :disabled="page.page <= 1" @click="precedente">
              Précédent
            </Bouton>
            <p class="discret">Page {{ page.page }} sur {{ page.pages }}</p>
            <Bouton variante="contour" taille="petit" :disabled="page.page >= page.pages" @click="suivante">
              Suivant
            </Bouton>
          </nav>
        </footer>
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

.erreur {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-petit);
  background: var(--retard);
  color: var(--retard-foreground);
}

.onglets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.onglet {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.25rem;
  padding: 0 1rem;
  border: 1px solid var(--input);
  border-radius: 999px;
  background: var(--surface);
  color: var(--foreground-doux);
  font-weight: 500;
  cursor: pointer;
}

.onglet--actif {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--primary-foreground);
}

.onglet:focus-visible,
.filtre:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.compte {
  font-size: 0.8125rem;
  opacity: 0.8;
}

.liste {
  border: 1px solid var(--border);
  border-radius: var(--radius-carte);
  background: var(--surface);
}

.liste__entete {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
}

.liste__entete .titre-carte {
  margin-right: 0.5rem;
}

.filtre {
  height: 2.125rem;
  padding: 0 0.75rem;
  border: 1px solid var(--input);
  border-radius: 999px;
  background: var(--surface);
  color: var(--foreground);
}

.defilement {
  overflow-x: auto;
}

.tableau {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.tableau th {
  padding: 0.5rem 1.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.tableau td {
  padding: 0.875rem 1.25rem;
  border-top: 1px solid var(--border-interne);
  color: var(--foreground-doux);
  vertical-align: top;
}

.echeance,
.marche {
  font-weight: 600;
  color: var(--foreground);
}

.delai {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.delai--attention {
  color: var(--attention-foreground);
}

.delai--retard {
  color: var(--retard-foreground);
}

.examiner {
  display: inline-flex;
  align-items: center;
  min-height: 2.125rem;
  padding: 0 0.875rem;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--foreground);
  font-weight: 500;
  text-decoration: none;
}

.examiner:hover {
  background: var(--muted);
}

.examiner:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.reference {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.vide {
  padding: 1.25rem;
  color: var(--muted-foreground);
}

.liste__pied {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid var(--border-interne);
}

.pagination {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
