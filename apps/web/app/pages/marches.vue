<script setup lang="ts">
import {
  type ContractState,
  filter,
  formatAmount,
  formatCompactAmount,
  formatPeriod,
  type ContractListItem,
  notifiedAmount,
  departments,
  summarize,
} from "#shared/domain/contracts";
import { parisToday, paginate, plural } from "#shared/domain/display";

definePageMeta({ middleware: "authenticated" });

useHead({ title: "Marchés - Suivi des marchés" });

const today = useState("aujourdhui", () => parisToday());

const { data: contracts, error } = await useFetch<ContractListItem[]>("/api/marches", {
  default: () => [],
});

const search = ref("");
const service = ref("");
const state = ref<ContractState>("en_cours");
const pageNumber = ref(1);

watch([search, service, state], () => {
  pageNumber.value = 1;
});

const summary = computed(() => summarize(contracts.value, today.value));
const offeredDepartments = computed(() => departments(contracts.value));
const page = computed(() =>
  paginate(
    filter(contracts.value, { search: search.value, service: service.value, state: state.value }, today.value),
    pageNumber.value,
  ),
);


const previous = () => {
  pageNumber.value = page.value.page - 1;
};
const next = () => {
  pageNumber.value = page.value.page + 1;
};
</script>

<template>
  <div class="page">
    <header class="entete">
      <div>
        <h1 class="titre-page">Marchés</h1>
        <p class="discret">
          {{ plural(summary.active, "marché") }} en cours, recopiés de CIRIL chaque nuit.
        </p>
      </div>
      <div class="recherche">
        <label for="recherche" class="visuellement-cache">Rechercher un marché</label>
        <input
          id="recherche"
          v-model="search"
          type="search"
          class="champ"
          placeholder="Objet, numéro ou titulaire"
        />
      </div>
    </header>

    <p v-if="error" role="alert" class="erreur">
      La liste des marchés n'a pas pu être chargée. Réessayez dans un instant.
    </p>

    <template v-else>
    <section aria-label="Chiffres clés" class="chiffres">
      <FigureCard label="Marchés en cours" :value="String(summary.active)" />
      <FigureCard label="Lots suivis" :value="String(summary.lots)" />
      <FigureCard label="Montant notifié" :value="formatCompactAmount(summary.notifiedAmount)" />
    </section>

    <section class="liste">
      <div class="liste__entete">
        <h2 class="titre-carte">Tous les marchés</h2>
        <label for="service" class="visuellement-cache">Service</label>
        <select id="service" v-model="service" class="filtre">
          <option value="">Tous les services</option>
          <option v-for="name in offeredDepartments" :key="name" :value="name">{{ name }}</option>
        </select>
        <label for="etat" class="visuellement-cache">État</label>
        <select id="etat" v-model="state" class="filtre">
          <option value="en_cours">En cours</option>
          <option value="termines">Terminés</option>
          <option value="tous">Tous les états</option>
        </select>
      </div>

      <div class="defilement">
        <table class="tableau">
          <caption class="visuellement-cache">Liste des marchés suivis</caption>
          <thead>
            <tr>
              <th scope="col">Marché</th>
              <th scope="col">Service</th>
              <th scope="col">Titulaire</th>
              <th scope="col">Période</th>
              <th scope="col" class="montant">Montant notifié</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in page.rows" :key="m.reference">
              <td>
                <p class="marche">{{ m.subject ?? "Sans objet" }}</p>
                <p class="reference">
                  {{ m.reference }}<template v-if="m.lots > 0"> · {{ plural(m.lots, "lot") }}</template>
                </p>
              </td>
              <td>{{ m.service ?? "Non renseigné" }}</td>
              <td>{{ m.holder ?? "Non renseigné" }}</td>
              <td>{{ formatPeriod(m.startsOn, m.endsOn) }}</td>
              <td class="montant">{{ formatAmount(notifiedAmount(m)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="page.total === 0" class="vide">Aucun marché ne correspond à ces critères.</p>

      <footer class="liste__pied">
        <p class="discret" aria-live="polite">
          Marchés affichés : {{ page.rows.length }} sur {{ page.total }}
        </p>
        <nav aria-label="Pagination" class="pagination">
          <Button variant="outline" size="small" :disabled="page.page <= 1" @click="previous">
            Précédent
          </Button>
          <p class="discret">Page {{ page.page }} sur {{ page.pages }}</p>
          <Button variant="outline" size="small" :disabled="page.page >= page.pages" @click="next">
            Suivant
          </Button>
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

.entete {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.champ {
  width: 18rem;
  max-width: 100%;
  height: 2.5rem;
  padding: 0 0.75rem;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--foreground);
}

.champ:focus-visible,
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

.tableau .montant {
  text-align: right;
  white-space: nowrap;
}

.marche {
  font-weight: 600;
  color: var(--foreground);
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
