<template>
  <div class="coquille">
    <Sidebar />
    <main class="contenu">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.coquille {
  display: grid;
  min-height: 100vh;
}

.contenu {
  width: 100%;
  max-width: 73.75rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

@media (min-width: 48rem) {
  .coquille {
    grid-template-columns: 15rem 1fr;
  }

  .contenu {
    padding: 2rem 1.875rem;
  }
}
</style>
