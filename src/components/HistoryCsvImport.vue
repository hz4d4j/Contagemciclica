<template>
  <div class="card shadow-sm mb-4">
    <div class="card-body">
      <h2 class="h5 mb-2">Histórico de contagem (CSV)</h2>
      <p class="text-body-secondary small mb-3">
        Envie o arquivo de histórico (.csv). Todas as colunas são gravadas e aparecem na tela de histórico.
      </p>
      <label for="historyCsvFile" class="form-label fw-semibold">Arquivo CSV</label>
      <input
        id="historyCsvFile"
        class="form-control"
        type="file"
        accept=".csv,text/csv"
        :disabled="busy"
        @change="onFileChange"
      />
      <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0" role="alert">
        {{ errorMessage }}
      </div>

      <div v-if="rows.length" class="d-flex flex-wrap align-items-center gap-3 mt-4">
        <button type="button" class="btn btn-primary" :disabled="busy" @click="saveRows">
          <span v-if="busy" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          Salvar {{ rows.length }} registro(s) no histórico
        </button>
        <span v-if="successMessage" class="text-success-emphasis">{{ successMessage }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { parseHistoryCsv } from '../lib/historyCsv'
import { saveHistoryRows } from '../apis/countApi'

const rows = ref([])
const busy = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function onFileChange(event) {
  const file = event.target.files?.[0]
  rows.value = []
  successMessage.value = ''
  errorMessage.value = ''
  if (!file) return

  busy.value = true
  try {
    rows.value = parseHistoryCsv(await file.text())
    if (!rows.value.length) errorMessage.value = 'Nenhum registro encontrado no arquivo.'
  } catch (error) {
    errorMessage.value = `Não foi possível ler o arquivo: ${error.message}`
  } finally {
    busy.value = false
  }
}

async function saveRows() {
  busy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const count = await saveHistoryRows(rows.value)
    successMessage.value = `${count} registro(s) salvos com sucesso.`
  } catch (error) {
    errorMessage.value = `Não foi possível salvar o histórico: ${error.message}`
  } finally {
    busy.value = false
  }
}
</script>
