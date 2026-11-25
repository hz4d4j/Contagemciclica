<template>
  <div class="card shadow-sm mb-4">
    <div class="card-body">
      <h2 class="h5 mb-1">Ajuste Financeiro mensal</h2>
      <p class="small text-body-secondary mb-3">
        Soma das diferenças entre o físico contado e o saldo QAD, multiplicadas pelo custo unitário de cada item, por mês.
        Verde indica sobra, vermelho indica falta.
      </p>

      <div class="d-flex flex-wrap gap-4 mb-3">
        <div>
          <small class="text-body-secondary">Último mês</small>
          <div class="h5 mb-0" :class="latest && latest.value < 0 ? 'text-danger-emphasis' : 'text-success-emphasis'">
            {{ latest ? `${latest.label}: ${latest.value}` : '-' }}
          </div>
        </div>
        <div>
          <small class="text-body-secondary">Ajuste total</small>
          <div class="h5 mb-0" :class="total < 0 ? 'text-danger-emphasis' : 'text-success-emphasis'">
            {{ formatUsd(total) }}
          </div>
        </div>
      </div>

      <p v-if="financials.unmatchedItems" class="small text-body-secondary mb-3">
        {{ financials.unmatchedItems }} item(ns) contado(s) não têm custo cadastrado e ficaram de fora.
      </p>

      <div v-if="!months.length" class="alert alert-secondary mb-0" role="status">
        Nenhuma contagem com custo cadastrado para calcular o ajuste.
      </div>
      <div v-else class="chart-box">
        <canvas ref="canvas" aria-label="Ajuste financeiro mensal"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js'
import { formatUsd } from '../lib/currency'
import { valueLabelsPlugin } from '../lib/chartValueLabels'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps({
  financials: { type: Object, required: true },
})

const canvas = ref(null)
let chart = null

const months = computed(() => props.financials.months)
const total = computed(() => months.value.reduce((sum, entry) => sum + entry.divergenceUsd, 0))
const latest = computed(() => {
  const last = months.value.at(-1)
  return last ? { label: monthLabel(last.month), value: formatUsd(last.divergenceUsd) } : null
})

function monthLabel(key) {
  const [year, month] = key.split('-')
  return `${month}/${year}`
}

function draw() {
  chart?.destroy()
  chart = null
  if (!canvas.value || !months.value.length) return

  const color = getComputedStyle(document.body).color
  chart = new Chart(canvas.value, {
    type: 'bar',
    plugins: [valueLabelsPlugin],
    data: {
      labels: months.value.map((entry) => monthLabel(entry.month)),
      datasets: [
        {
          label: 'Ajuste (USD)',
          data: months.value.map((entry) => Number(entry.divergenceUsd.toFixed(2))),
          backgroundColor: months.value.map((entry) => (entry.divergenceUsd >= 0 ? '#198754' : '#dc3545')),
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      layout: { padding: { top: 24 } },
      plugins: {
        legend: { display: false },
        valueLabels: { color, format: (value) => formatUsd(value) },
        tooltip: {
          callbacks: {
            label: (context) => formatUsd(context.parsed.y),
            afterLabel: (context) => `Contagens: ${months.value[context.dataIndex].countedItems}`,
          },
        },
      },
      scales: {
        x: { ticks: { color }, grid: { display: false } },
        y: {
          ticks: { color, callback: (value) => formatUsd(value) },
          grid: { color: 'rgba(128, 128, 128, 0.2)' },
        },
      },
    },
  })
}

watch(
  () => props.financials,
  () => nextTick(draw),
)

onMounted(draw)

onBeforeUnmount(() => {
  chart?.destroy()
})
</script>

<style scoped>
.chart-box {
  position: relative;
  height: 360px;
}
</style>
