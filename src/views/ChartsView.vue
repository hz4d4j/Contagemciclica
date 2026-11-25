<template>
  <section>
    <h1 class="h3 mb-1">Gráficos de contagem</h1>
    <p class="text-body-secondary mb-4">Resultados das contagens já finalizadas.</p>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div>
    </div>
    <template v-else>
      <div v-if="loadError" class="alert alert-danger" role="alert">{{ loadError }}</div>
      <div v-else-if="!summary.total && !history.length" class="alert alert-secondary" role="status">
        Ainda não há contagens finalizadas para exibir.
      </div>

      <HistoryCharts v-if="history.length" :rows="history" class="mb-5" />

      <template v-if="summary.total">
        <div class="row g-3 mb-4">
          <div v-for="card in summaryCards" :key="card.label" class="col-6 col-lg-3">
            <div class="card shadow-sm card-hover h-100">
              <div class="card-body">
                <small class="text-body-secondary">{{ card.label }}</small>
                <div class="h4 mb-0 mt-1" :class="card.class">{{ card.value }}</div>
              </div>
            </div>
          </div>
        </div>

      </template>

      <FinancialAccuracyChart v-if="financials" :financials="financials" class="mt-4" />
      <FinancialAdjustmentChart v-if="financials" :financials="financials" class="mt-4" />
      <PnVarianceChart v-if="history.length" :rows="history" class="mt-4" />
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import HistoryCharts from '../components/HistoryCharts.vue'
import FinancialAccuracyChart from '../components/FinancialAccuracyChart.vue'
import FinancialAdjustmentChart from '../components/FinancialAdjustmentChart.vue'
import PnVarianceChart from '../components/PnVarianceChart.vue'
import { loadCompletedResults, loadHistoryRows, loadItemCosts } from '../apis/countApi'
import { buildMonthlyFinancials } from '../lib/monthlyFinancials'

const loading = ref(true)
const loadError = ref('')
const rows = ref([])
const history = ref([])
const financials = ref(null)

function summarize(results) {
  let total = 0
  let matches = 0
  for (const row of results) {
    total += 1
    if (Number(row.counted_qty) === Number(row.system_qty)) matches += 1
  }
  return { total, matches, divergent: total - matches, accuracy: total ? (matches / total) * 100 : 0 }
}

const summary = computed(() => summarize(rows.value))

const summaryCards = computed(() => [
  { label: 'Itens contados', value: summary.value.total.toLocaleString('pt-BR'), class: '' },
  { label: 'Acuracidade geral', value: `${summary.value.accuracy.toFixed(1)}%`, class: 'text-success-emphasis' },
  { label: 'Itens certos', value: summary.value.matches.toLocaleString('pt-BR'), class: 'text-success-emphasis' },
  { label: 'Divergências', value: summary.value.divergent.toLocaleString('pt-BR'), class: 'text-danger-emphasis' },
])

async function load() {
  loading.value = true
  loadError.value = ''
  const [completed, historyResult, costs] = await Promise.allSettled([
    loadCompletedResults(),
    loadHistoryRows(),
    loadItemCosts(),
  ])
  const errors = []
  if (completed.status === 'fulfilled') rows.value = completed.value
  else errors.push(`as contagens finalizadas (${completed.reason.message})`)
  if (historyResult.status === 'fulfilled') history.value = historyResult.value
  else errors.push(`o histórico (${historyResult.reason.message})`)
  if (costs.status === 'fulfilled') {
    if (historyResult.status === 'fulfilled') financials.value = buildMonthlyFinancials(costs.value, historyResult.value)
  } else {
    errors.push(`os custos dos itens (${costs.reason.message})`)
  }
  if (errors.length) loadError.value = `Não foi possível carregar ${errors.join(' e ')}.`
  loading.value = false
}

onMounted(load)
</script>
