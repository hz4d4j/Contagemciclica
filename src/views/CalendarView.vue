<template>
  <section>
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Calendário de contagem</h1>
        <p class="text-body-secondary mb-0">Duas contagens por dia útil, pela classe ABC e pela última contagem.</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-outline-secondary" aria-label="Mês anterior" @click="shiftMonth(-1)">
          &larr;
        </button>
        <span class="btn btn-light disabled fw-semibold text-capitalize" aria-live="polite">{{ monthLabel }}</span>
        <button type="button" class="btn btn-outline-secondary" aria-label="Próximo mês" @click="shiftMonth(1)">
          &rarr;
        </button>
        <button type="button" class="btn btn-primary" :disabled="loading" @click="recalculate">
          Recalcular próximas contagens
        </button>
      </div>
    </div>

    <div v-if="message" class="alert" :class="messageClass" role="status">{{ message }}</div>
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div>
    </div>

    <div v-else class="calendar-grid">
      <div v-for="name in weekdayNames" :key="name" class="calendar-weekday">{{ name }}</div>
      <div
        v-for="cell in cells"
        :key="cell.key"
        class="calendar-day card"
        :class="{ 'calendar-day--muted': !cell.date, 'calendar-day--weekend': cell.isWeekend }"
      >
        <div v-if="cell.date" class="card-body p-2">
          <div class="small fw-semibold mb-1">{{ cell.day }}</div>
          <RouterLink
            v-for="plan in cell.plans"
            :key="plan.id"
            :to="{ path: '/operador', query: { date: plan.scheduled_date } }"
            class="d-block badge rounded-pill mb-1 text-truncate text-decoration-none plan-chip"
            :class="planClass(plan)"
            :title="`${plan.count_items?.sku} - ${plan.count_items?.description} (${plan.status === 'completed' ? 'concluída' : 'pendente'})`"
          >
            {{ planLabel(plan) }}
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { listPlansInMonth, loadItemCosts, rebuildSchedule } from '../apis/countApi'

const weekdayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())
const plans = ref([])
const abcByPn = ref(new Map())
const loading = ref(false)
const message = ref('')
const messageClass = ref('alert-success')

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
)

const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const plansByDate = new Map()
  for (const plan of plans.value) {
    const list = plansByDate.get(plan.scheduled_date) ?? []
    list.push(plan)
    plansByDate.set(plan.scheduled_date, list)
  }

  const result = []
  for (let i = 0; i < offset; i++) result.push({ key: `pad-${i}`, date: null })
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewYear.value, viewMonth.value, day)
    const iso = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    result.push({
      key: iso,
      date: iso,
      day,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      plans: plansByDate.get(iso) ?? [],
    })
  }
  return result
})

async function fetchCalendar() {
  const [planRows, costs] = await Promise.all([listPlansInMonth(viewYear.value, viewMonth.value), loadItemCosts()])
  plans.value = planRows
  abcByPn.value = new Map(costs.map((cost) => [cost.pn, cost.abc]))
}

const CLASS_CHIP_CLASSES = { A: 'plan-chip--a', B: 'text-bg-primary', C: 'text-bg-secondary' }

function abcOf(plan) {
  return abcByPn.value.get(plan.count_items?.sku) ?? plan.count_items?.abc_class
}

function planLabel(plan) {
  const sku = plan.count_items?.sku
  const abc = abcOf(plan)
  return abc ? `${sku} - ${abc}` : sku
}

function planClass(plan) {
  return [CLASS_CHIP_CLASSES[abcOf(plan)] ?? 'text-bg-light', plan.status === 'completed' ? 'plan-chip--done' : '']
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    await fetchCalendar()
  } catch (error) {
    message.value = `Não foi possível carregar o calendário: ${error.message}`
    messageClass.value = 'alert-danger'
  } finally {
    loading.value = false
  }
}

async function recalculate() {
  loading.value = true
  message.value = ''
  try {
    const scheduled = await rebuildSchedule()
    message.value = `${scheduled} contagens programadas. As já realizadas foram mantidas.`
    messageClass.value = 'alert-success'
    await fetchCalendar()
  } catch (error) {
    message.value = `Não foi possível recalcular o calendário: ${error.message}`
    messageClass.value = 'alert-danger'
  } finally {
    loading.value = false
  }
}

function shiftMonth(delta) {
  const date = new Date(viewYear.value, viewMonth.value + delta, 1)
  viewYear.value = date.getFullYear()
  viewMonth.value = date.getMonth()
}

watch([viewYear, viewMonth], load)
onMounted(load)
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.calendar-weekday {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--bs-secondary-color);
  padding: 4px 0;
}

.calendar-day {
  min-height: 96px;
}

.calendar-day--muted {
  visibility: hidden;
}

.calendar-day--weekend {
  opacity: 0.6;
}

.plan-chip {
  font-size: 0.7rem;
  font-weight: 500;
  max-width: 100%;
  transition: transform 0.15s ease;
}

.plan-chip:hover {
  transform: scale(1.03);
}

.plan-chip--a {
  background-color: #f97316;
  color: #1c1917;
}

.plan-chip--done {
  text-decoration: line-through;
}

@media (max-width: 767px) {
  .calendar-day {
    min-height: 64px;
  }

  .plan-chip {
    font-size: 0.6rem;
  }
}
</style>
