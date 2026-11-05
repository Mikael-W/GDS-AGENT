<template>
  <aside aria-label="Barre latérale" class="flex flex-col gap-6 border-b border-border bg-surface p-4 md:border-r md:border-b-0">
    <div class="flex items-center gap-3">
      <span aria-hidden="true" class="size-9 shrink-0 rounded-petit bg-primary" />
      <div>
        <p class="font-semibold leading-tight">Marchés</p>
        <p class="text-[0.8125rem] text-muted-foreground">CC Golfe de Saint-Tropez</p>
      </div>
    </div>

    <nav aria-label="Navigation principale" class="flex flex-col gap-1">
      <ElementNavigation libelle="Tableau de bord" route="/tableau-de-bord" />
    </nav>

    <div class="mt-auto flex flex-col gap-3">
      <EtatSynchronisation />
      <form action="/auth/deconnexion" method="post" class="py-0.5">
        <Bouton type="submit" variante="contour">Se déconnecter</Bouton>
      </form>
    </div>
  </aside>
</template>
