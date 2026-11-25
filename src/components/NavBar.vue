<template>
  <nav class="navbar navbar-expand-md sticky-top navbar-nexteer">
    <div class="container-xl">
      <RouterLink to="/operador" class="navbar-brand fw-semibold">Contagem Cíclica</RouterLink>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        aria-controls="mainNav"
        aria-expanded="false"
        aria-label="Abrir menu"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div id="mainNav" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto">
          <li v-for="link in links" :key="link.to" class="nav-item">
            <RouterLink :to="link.to" class="nav-link" active-class="active fw-semibold">
              {{ link.label }}
            </RouterLink>
          </li>
        </ul>
        <button
          class="btn btn-sm theme-toggle btn-nexteer-toggle"
          type="button"
          :aria-label="theme.dark ? 'Ativar tema claro' : 'Ativar tema escuro'"
          @click="theme.toggle()"
        >
          {{ theme.dark ? 'Tema claro' : 'Tema escuro' }}
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useThemeStore } from '../stores/themeStore'

const theme = useThemeStore()

const links = [
  { to: '/operador', label: 'Painel de contagem cíclica' },
  { to: '/conferencia-posicao', label: 'Conferência de posição' },
  { to: '/calendario', label: 'Calendário' },
  { to: '/graficos', label: 'Gráficos' },
  { to: '/historico', label: 'Histórico' },
  { to: '/custos', label: 'Custos' },
  { to: '/importar', label: 'Importar Excel' },
]
</script>

<style scoped>
.theme-toggle {
  transition: background-color 0.2s ease, color 0.2s ease;
}
</style>
