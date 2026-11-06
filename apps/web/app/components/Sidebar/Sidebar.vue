<template>
  <aside aria-label="Barre latérale" class="barre">
    <div class="identity">
      <span aria-hidden="true" class="pastille" />
      <div>
        <p class="nom">Marchés</p>
        <p class="collectivite">CC Golfe de Saint-Tropez</p>
      </div>
    </div>

    <nav aria-label="Navigation principale" class="navigation">
      <NavigationItem label="Tableau de bord" route="/tableau-de-bord" />
      <NavigationItem label="Alertes" route="/alertes" />
      <NavigationItem label="Marchés" route="/marches" />
      <NavigationItem label="Échéancier" route="/echeancier" />
    </nav>

    <div class="pied">
      <SynchronizationStatus />
      <form action="/auth/deconnexion" method="post" class="deconnexion">
        <Button type="submit" variant="outline">Se déconnecter</Button>
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

.identity {
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
