<template>
  <section>
    <h1 class="h3 mb-1">Migração de dados (Bolt → Azure SQL)</h1>
    <p class="text-body-secondary mb-4">
      Exporta todos os dados do Bolt (Supabase) e envia para o Azure SQL Server via API.
      UUIDs são preservados. A migração é reexecutável: rodar de novo atualiza os registros existentes.
    </p>

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h5 mb-3">Passo 1: Exportar dados do Bolt</h2>
        <p class="text-body-secondary small mb-3">
          Lê todas as 7 tabelas do Supabase e monta o payload de migração.
        </p>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="exportData">
          <span v-if="busy && step === 'export'" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          Exportar dados
        </button>
        <div v-if="exportSummary" class="mt-3">
          <table class="table table-sm mb-0">
            <thead><tr><th>Tabela</th><th class="text-end">Registros</th></tr></thead>
            <tbody>
              <tr v-for="(count, table) in exportSummary" :key="table">
                <td>{{ table }}</td>
                <td class="text-end">{{ count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="exportPayload" class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h5 mb-3">Passo 2: Enviar para Azure SQL</h2>
        <p class="text-body-secondary small mb-3">
          O backend valida e insere os dados preservando UUIDs e integridade referencial.
        </p>
        <button type="button" class="btn btn-success" :disabled="busy" @click="sendMigration">
          <span v-if="busy && step === 'migrate'" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          Migrar para Azure SQL
        </button>
      </div>
    </div>

    <div v-if="migrationResult" class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h5 mb-3">Resultado da migração</h2>
        <table class="table table-sm mb-0">
          <thead><tr><th>Tabela</th><th class="text-end">Esperado</th><th class="text-end">Atual</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="(v, table) in migrationResult.validations" :key="table">
              <td>{{ table }}</td>
              <td class="text-end">{{ v.expected }}</td>
              <td class="text-end">{{ v.actual }}</td>
              <td><span :class="v.ok ? 'badge text-bg-success' : 'badge text-bg-danger'">{{ v.ok ? 'OK' : 'Divergente' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { isCatalystMode } from '../lib/appMode'
import { catalystApi } from '../apis/catalystApi'

const busy = ref(false)
const step = ref('')
const exportSummary = ref(null)
const exportPayload = ref(null)
const migrationResult = ref(null)
const errorMessage = ref('')

async function fetchAll(table, select) {
  const { supabase } = await import('../lib/supabase')
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

async function exportData() {
  busy.value = true
  step.value = 'export'
  errorMessage.value = ''
  exportSummary.value = null
  exportPayload.value = null
  try {
    const [bases, items, plans, results, history, costs, positionChecks] = await Promise.all([
      fetchAll('count_bases', '*'),
      fetchAll('count_items', '*'),
      fetchAll('count_plans', '*'),
      fetchAll('count_results', '*'),
      fetchAll('count_history', '*'),
      fetchAll('item_costs', '*'),
      fetchAll('position_checks', '*'),
    ])
    exportPayload.value = { bases, items, plans, results, history, costs, positionChecks }
    exportSummary.value = {
      count_bases: bases.length,
      count_items: items.length,
      count_plans: plans.length,
      count_results: results.length,
      count_history: history.length,
      item_costs: costs.length,
      position_checks: positionChecks.length,
    }
  } catch (error) {
    errorMessage.value = `Não foi possível exportar: ${error.message}`
  } finally {
    busy.value = false
    step.value = ''
  }
}

async function sendMigration() {
  busy.value = true
  step.value = 'migrate'
  errorMessage.value = ''
  migrationResult.value = null
  try {
    const result = await catalystApi.migrateData(exportPayload.value)
    migrationResult.value = result
  } catch (error) {
    errorMessage.value = `Não foi possível migrar: ${error.message}`
  } finally {
    busy.value = false
    step.value = ''
  }
}
</script>
