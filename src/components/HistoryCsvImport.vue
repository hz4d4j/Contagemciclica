<template>
  <div class="card shadow-sm mb-4">
    <div class="card-body">
      <h2 class="h5 mb-2">Importar CSV</h2>
      <p class="text-body-secondary small mb-3">
        Envie um histórico de contagens, cadastro de itens ou custos por PN. O tipo será identificado pelas colunas.
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

      <div v-if="catalog" class="mt-3">
        <p v-if="catalog.type === 'bases'">Cadastro de itens: {{ catalog.bases.length }} base(s), {{ catalog.bases.reduce((n, b) => n + b.items.length, 0) }} item(ns), agrupados pela coluna Local. Este arquivo não contém saldo ou histórico de contagem.</p>
        <p v-else>Custos por PN: {{ catalog.costs.length }} item(ns). PNs existentes terão seus custos atualizados.</p>
        <p v-if="catalog.duplicates">{{ catalog.duplicates }} linha(s) duplicada(s) ignorada(s).</p>
        <p v-if="catalog.unsupportedAbc" class="text-warning">{{ catalog.unsupportedAbc }} item(ns) têm classificação diferente de A, B ou C; essa classificação não será importada.</p>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="saveCatalog">Salvar {{ catalog.type === 'bases' ? 'cadastro' : 'custos' }}</button>
        <span v-if="successMessage" class="text-success-emphasis ms-3">{{ successMessage }}</span>
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
import { parseCatalogCsv } from '../lib/catalogCsv'
import { saveHistoryRows, saveImportedBases, saveItemCosts } from '../apis/countApi'

const rows = ref([])
const catalog = ref(null)
const busy = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function onFileChange(event) {
  const file = event.target.files?.[0]
  rows.value = []
  catalog.value = null
  successMessage.value = ''
  errorMessage.value = ''
  if (!file) return

  busy.value = true
  try {
    const text = await file.text()
    const detected = parseCatalogCsv(text)
    if (detected.type !== 'history') { catalog.value = detected; return }
    rows.value = parseHistoryCsv(text)
    if (!rows.value.length) errorMessage.value = 'Nenhum registro encontrado no arquivo.'
  } catch (error) {
    errorMessage.value = `Não foi possível ler o arquivo: ${error.message}`
  } finally {
    busy.value = false
  }
}

async function saveCatalog() {
  busy.value = true; errorMessage.value = ''; successMessage.value = ''
  try {
    if (catalog.value.type === 'bases') {
      const result = await saveImportedBases(catalog.value.bases)
      successMessage.value = `${result.itemCount} item(ns) em ${result.baseCount} base(s) salvos.`
    } else {
      const count = await saveItemCosts(catalog.value.costs)
      successMessage.value = `${count} custo(s) salvos.`
    }
  } catch (error) { errorMessage.value = `Não foi possível salvar: ${error.message}` }
  finally { busy.value = false }
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
