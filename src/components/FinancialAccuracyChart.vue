<template>
  <div class="card shadow-sm mb-4">
    <div class="card-body">
      <h2 class="h5 mb-1">Acurácia Financeira Mensal</h2>
      <p class="small text-body-secondary mb-3">
        Percentual do valor do estoque que bateu com o físico contado, por mês. Quanto maior a barra, melhor.
      </p>

      <div class="formula-box small rounded p-3 mb-3">
        <div class="fw-semibold mb-1">Fórmula</div>
        <code class="d-block mb-2">Acurácia Financeira (%) = (1 − |Valor das Divergências| ÷ Valor Total do Estoque) × 100</code>
        <ul class="mb-0 ps-3">
          <li>Valor das Divergências: soma de (físico contado − saldo QAD) × custo unitário, dos itens contados no mês.</li>
          <li>Valor Total do Estoque: soma de saldo QAD × custo unitário, dos itens contados no mês.</li>
        </ul>
      </div>

      <div class="d-flex flex-wrap gap-4 mb-3">
        <div>
          <small class="text-body-secondary">Último mês</small>
          <div class="h5 mb-0">{{ latest ? `${latest.label}: ${latest.pct}` : '-' }}</div>
        </div>
        <div>
          <small class="text-body-secondary">Meses analisados</small>
          <div class="h5 mb-0">{{ months.length.toLocaleString('pt-BR') }}</div>
        </div>
      </div>

      <p v-if="financials.unmatchedItems" class="small text-body-secondary mb-3">
        {{ financials.unmatchedItems }} item(ns) contado(s) não têm custo cadastrado e ficaram de fora.
      </p>

      <div v-if="!months.length" class="alert alert-secondary mb-0" role="status">
        Nenhuma contagem com custo cadastrado para calcular a acurácia.
      </div>
      <div v-else class="chart-box">
        <canvas ref="canvas" aria-label="Acurácia financeira mensal"></canvas>
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

const months = computed(() => props.financials.months.filter((entry) => entry.accuracyPct !== null))

const latest = computed(() => {
  const last = months.value.at(-1)
  return last ? { label: monthLabel(last.month), pct: `${last.accuracyPct.toFixed(2)}%` } : null
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
    data: {
      labels: months.value.map((entry) => monthLabel(entry.month)),
      datasets: [
        {
          label: 'Acurácia financeira (%)',
          data: months.value.map((entry) => Number(entry.accuracyPct.toFixed(2))),
          backgroundColor: '#0d6efd',
          borderRadius: 4,
        },
      ],
    },
    plugins: [valueLabelsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      layout: { padding: { top: 24 } },
      plugins: {
        legend: { display: false },
        valueLabels: { color, format: (value) => `${value.toFixed(2)}%` },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.y.toFixed(2)}%`,
            afterLabel: (context) => {
              const entry = months.value[context.dataIndex]
              return [
                `Valor das divergências: ${formatUsd(entry.divergenceUsd)}`,
                `Valor total do estoque: ${formatUsd(entry.stockValueUsd)}`,
                `Contagens: ${entry.countedItems}`,
              ]
            },
          },
        },
      },
      scales: {
        x: { ticks: { color }, grid: { display: false } },
        y: {
          max: 100,
          ticks: { color, callback: (value) => `${value}%` },
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

.formula-box {
  background-color: var(--bs-tertiary-bg);
  border: 1px solid var(--bs-border-color);
}

code {
  white-space: normal;
}
</style>
