<template>
  <aside aria-label="Barre latérale" class="barre">
    <div class="identite">
      <span aria-hidden="true" class="pastille" />
      <div>
        <p class="nom">Marchés</p>
        <p class="collectivite">CC Golfe de Saint-Tropez</p>
      </div>
    </div>

    <nav aria-label="Navigation principale" class="navigation">
      <ElementNavigation libelle="Tableau de bord" route="/tableau-de-bord" />
      <ElementNavigation libelle="Alertes" route="/alertes" />
      <ElementNavigation libelle="Marchés" route="/marches" />
      <ElementNavigation libelle="Échéancier" route="/echeancier" />
    </nav>

    <div class="pied">
      <EtatSynchronisation />
      <form action="/auth/deconnexion" method="post" class="deconnexion">
        <Bouton type="submit" variante="contour">Se déconnecter</Bouton>
      </form>
    </div>
  </aside>
</template>

<style scoped>
.barre {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

@media (min-width: 48rem) {
  .barre {
    border-right: 1px solid var(--border);
    border-bottom: 0;
  }
}

.identite {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pastille {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-petit);
  background: var(--primary);
}

.nom {
  font-weight: 600;
  line-height: 1.25;
}

.collectivite {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}

.navigation {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.pied {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: auto;
}

.deconnexion {
  padding: 0.125rem 0;
}
</style>
