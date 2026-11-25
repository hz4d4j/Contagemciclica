<template>
  <div class="app-shell">
    <NavBar />
    <main class="container-xl py-4 px-3">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import NavBar from './components/NavBar.vue'
</script>
