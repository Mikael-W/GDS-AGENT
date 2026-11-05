<template>
  <div class="grid min-h-screen md:grid-cols-[15rem_1fr]">
    <BarreLaterale />
    <main class="mx-auto w-full max-w-295 px-4 py-8 md:px-7.5">
      <slot />
    </main>
  </div>
</template>
