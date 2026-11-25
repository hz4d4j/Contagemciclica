<template>
  <section>
    <h1 class="h3 mb-1">Painel de contagem cíclica</h1>
    <p class="text-body-secondary mb-2">Escolha a data e confirme a quantidade contada de cada item do dia.</p>
    <ul class="list-unstyled small text-body-secondary mb-4">
      <li><span class="fw-semibold">Classe A</span> - Frequência: Diária ou Semanal</li>
      <li><span class="fw-semibold">Classe B</span> - Frequência: Semanal ou Quinzenal</li>
      <li><span class="fw-semibold">Classe C</span> - Frequência: Mensal ou trimestral</li>
    </ul>

    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <label for="countDate" class="form-label fw-semibold">Data da contagem</label>
        <input id="countDate" v-model="selectedDate" type="date" class="form-control" />
      </div>
      <div class="col-md-4">
        <label for="operatorName" class="form-label fw-semibold">Nome do responsável</label>
        <input
          id="operatorName"
          v-model.trim="operatorName"
          type="text"
          class="form-control"
          placeholder="Seu nome"
          @change="rememberOperator"
        />
        <div v-if="!operatorName" class="form-text">Informe o responsável para confirmar as contagens.</div>
      </div>
    </div>

    <DailyCountList
      :key="selectedDate"
      :rows="rows"
      :operator-name="operatorName"
      :loading="loading"
      :load-error="loadError"
      @counted="markCounted"
      @changed="markCounted"
    />
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { listPlansOnDate, loadItemCosts, loadLastHistoryCountDates } from '../apis/countApi'
import { lastCountedOf } from '../lib/countSchedule'
import DailyCountList from '../components/DailyCountList.vue'

const OPERATOR_KEY = 'contagem-operador'

function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const selectedDate = ref(todayIso())
const operatorName = ref(localStorage.getItem(OPERATOR_KEY) ?? '')
const rows = ref([])
const loading = ref(false)
const loadError = ref('')

function rememberOperator() {
  localStorage.setItem(OPERATOR_KEY, operatorName.value)
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [plans, historyDates, costs] = await Promise.all([
      listPlansOnDate(selectedDate.value),
      loadLastHistoryCountDates(),
      loadItemCosts(),
    ])
    const descriptionByPn = new Map(costs.map((cost) => [cost.pn, cost.description]))
    rows.value = plans.map((plan) => ({
      id: plan.id,
      baseId: plan.base_id,
      status: plan.status,
      item: {
        ...plan.count_items,
        description: descriptionByPn.get(plan.count_items.sku) ?? plan.count_items.description,
      },
      lastCountedAt: lastCountedOf(plan.count_items, historyDates),
      result: plan.count_results?.[0] ?? null,
    }))
  } catch (error) {
    rows.value = []
    loadError.value = `Não foi possível carregar as contagens: ${error.message}`
  } finally {
    loading.value = false
  }
}

function markCounted() {
  load()
}

watch(selectedDate, load)
onMounted(load)
</script>
