<template>
  <div class="card shadow-sm">
    <div class="card-body">
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h2 class="h5 mb-1">Variação Física x QAD por mês</h2>
          <p class="small text-body-secondary mb-0">
            Soma da coluna Variação Física x QAD de cada PN por mês.
            Verde indica sobra, vermelho indica falta.
          </p>
        </div>
        <select
          v-if="data.pns.length"
          v-model="selectedPn"
          class="form-select pn-select"
          aria-label="Itens"
        >
          <option :value="ALL_ITEMS">Todos os itens</option>
          <option v-for="entry in data.pns" :key="entry.pn" :value="entry.pn">
            {{ entry.pn }} - {{ entry.description }}
          </option>
        </select>
      </div>

      <div v-if="!data.pns.length" class="alert alert-secondary mb-0" role="status">
        Nenhuma contagem com Variação Física x QAD para exibir.
      </div>
      <div v-else class="chart-box" :class="{ 'chart-box-tall': showAll }">
        <canvas ref="canvas" aria-label="Variação Física x QAD por mês"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js'
import { monthLabel, varianceByPnAndMonth } from '../lib/historyStats'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps({
  rows: { type: Array, required: true },
})

const ALL_ITEMS = '__all__'
const GREEN = '#198754'
const RED = '#dc3545'

const canvas = ref(null)
const selectedPn = ref('')
let chart = null

const data = computed(() => varianceByPnAndMonth(props.rows))
const showAll = computed(() => selectedPn.value === ALL_ITEMS)
const activePn = computed(
  () => data.value.pns.find((entry) => entry.pn === selectedPn.value) ?? data.value.pns[0] ?? null,
)

function formatQty(value) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

function colorFor(index) {
  return `hsl(${(index * 137.508) % 360} 65% 50%)`
}

function valuesFor(entry) {
  return data.value.months.map((month) => entry.byMonth.get(month) ?? null)
}

function singleDatasets() {
  const values = valuesFor(activePn.value)
  return [
    {
      label: `${activePn.value.pn} - ${activePn.value.description}`,
      data: values,
      backgroundColor: values.map((value) => (value >= 0 ? GREEN : RED)),
      borderRadius: 4,
    },
  ]
}

function allDatasets() {
  return data.value.pns.map((entry, index) => ({
    label: `${entry.pn} - ${entry.description}`,
    data: valuesFor(entry),
    backgroundColor: colorFor(index),
    borderWidth: 0,
  }))
}

function draw() {
  chart?.destroy()
  chart = null
  if (!canvas.value || !data.value.pns.length) return

  const color = getComputedStyle(document.body).color
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels: data.value.months.map(monthLabel),
      datasets: showAll.value ? allDatasets() : singleDatasets(),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatQty(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { stacked: showAll.value, ticks: { color }, grid: { display: false } },
        y: {
          stacked: showAll.value,
          ticks: { color, callback: (value) => formatQty(value) },
          grid: { color: 'rgba(128, 128, 128, 0.2)' },
        },
      },
    },
  })
}

watch(selectedPn, () => nextTick(draw))

onMounted(() => {
  selectedPn.value = data.value.pns[0]?.pn ?? ''
  nextTick(draw)
})

onBeforeUnmount(() => {
  chart?.destroy()
})
</script>

<style scoped>
.pn-select {
  width: auto;
  min-width: 240px;
  max-width: 100%;
}

.chart-box {
  position: relative;
  height: 320px;
}

.chart-box-tall {
  height: 480px;
}
</style>
