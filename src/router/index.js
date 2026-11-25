import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/operador' },
  { path: '/importar', name: 'importar', component: () => import('../views/ImportView.vue') },
  { path: '/calendario', name: 'calendario', component: () => import('../views/CalendarView.vue') },
  { path: '/operador', name: 'operador', component: () => import('../views/OperatorView.vue') },
  { path: '/graficos', name: 'graficos', component: () => import('../views/ChartsView.vue') },
  { path: '/historico', name: 'historico', component: () => import('../views/HistoryView.vue') },
  { path: '/custos', name: 'custos', component: () => import('../views/ItemCostsView.vue') },
  { path: '/conferencia-posicao', name: 'conferencia-posicao', component: () => import('../views/PositionCheckView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
