<template>
  <div>
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

    <div class="row g-3 mb-4">
      <div class="col-lg-6">
        <div class="card shadow-sm h-100">
          <div class="card-body">
            <h2 class="h6 mb-3">Itens contados por mês</h2>
            <div class="chart-box">
              <canvas ref="countCanvas" aria-label="Itens contados por mês"></canvas>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card shadow-sm h-100">
          <div class="card-body">
            <h2 class="h6 mb-3">Acurácia de itens por mês (%)</h2>
            <div class="chart-box">
              <canvas ref="accuracyCanvas" aria-label="Acurácia de itens por mês"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { monthLabel, monthlyAccuracy } from '../lib/historyStats'
import { valueLabelsPlugin } from '../lib/chartValueLabels'

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
)

const props = defineProps({
  rows: { type: Array, required: true },
})

const countCanvas = ref(null)
const accuracyCanvas = ref(null)
let countChart = null
let accuracyChart = null

const monthly = computed(() => monthlyAccuracy(props.rows))

const summaryCards = computed(() => {
  const months = monthly.value
  const last = months.at(-1)
  const totalCounted = months.reduce((sum, month) => sum + month.counted, 0)
  const totalAccurate = months.reduce((sum, month) => sum + month.accurate, 0)
  const yearAccuracy = totalCounted ? (totalAccurate / totalCounted) * 100 : null
  return [
    {
      label: `Acurácia de itens (${last ? monthLabel(last.month) : '-'})`,
      value: last ? `${last.accuracy.toFixed(1)}%` : '-',
      class: 'text-success-emphasis',
    },
    {
      label: `Itens contados (${last ? monthLabel(last.month) : '-'})`,
      value: last ? last.counted.toLocaleString('pt-BR') : '-',
      class: '',
    },
    {
      label: 'Acurácia de itens (no período)',
      value: yearAccuracy === null ? '-' : `${yearAccuracy.toFixed(1)}%`,
      class: 'text-success-emphasis',
    },
    {
      label: 'Itens contados (no período)',
      value: totalCounted.toLocaleString('pt-BR'),
      class: '',
    },
  ]
})

function textColor() {
  return getComputedStyle(document.body).color
}

function drawCharts() {
  countChart?.destroy()
  accuracyChart?.destroy()
  const color = textColor()
  const grid = 'rgba(128, 128, 128, 0.2)'
  const labels = monthly.value.map((month) => monthLabel(month.month))

  countChart = new Chart(countCanvas.value, {
    type: 'bar',
    plugins: [valueLabelsPlugin],
    data: {
      labels,
      datasets: [
        {
          label: 'Itens contados',
          data: monthly.value.map((month) => month.counted),
          backgroundColor: '#0d6efd',
          borderRadius: 6,
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
        valueLabels: { color, format: (value) => value.toLocaleString('pt-BR') },
      },
      scales: {
        y: { beginAtZero: true, ticks: { color }, grid: { color: grid } },
        x: { ticks: { color }, grid: { display: false } },
      },
    },
  })

  accuracyChart = new Chart(accuracyCanvas.value, {
    type: 'line',
    plugins: [valueLabelsPlugin],
    data: {
      labels,
      datasets: [
        {
          label: 'Acurácia de itens (%)',
          data: monthly.value.map((month) => Number(month.accuracy.toFixed(1))),
          borderColor: '#198754',
          backgroundColor: '#198754',
          pointRadius: 5,
          tension: 0.3,
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
        valueLabels: { color, format: (value) => `${value.toFixed(1)}%` },
      },
      scales: {
        y: { min: 0, max: 100, ticks: { color }, grid: { color: grid } },
        x: { ticks: { color }, grid: { display: false } },
      },
    },
  })
}

watch(monthly, async () => {
  await nextTick()
  if (countCanvas.value) drawCharts()
})

onMounted(drawCharts)

onBeforeUnmount(() => {
  countChart?.destroy()
  accuracyChart?.destroy()
})
</script>

<style scoped>
.chart-box {
  position: relative;
  height: 280px;
}
</style>
