<template>
  <section>
    <h1 class="h3 mb-1">Importar Excel</h1>
    <p class="text-body-secondary mb-4">
      Cada aba da planilha vira uma base. A coluna de código, a descrição, a localização e o saldo são lidas automaticamente.
    </p>

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <label for="excelFile" class="form-label fw-semibold">Arquivo Excel (.xlsx)</label>
        <input
          id="excelFile"
          class="form-control"
          type="file"
          accept=".xlsx,.xls"
          :disabled="busy"
          @change="onFileChange"
        />
        <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0" role="alert">
          {{ errorMessage }}
        </div>
      </div>
    </div>

    <div v-if="bases.length" class="card shadow-sm">
      <div class="card-body">
        <h2 class="h5 mb-3">Bases encontradas</h2>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Base</th>
                <th scope="col" class="text-end">Itens</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="base in bases" :key="base.name">
                <td class="fw-semibold">{{ base.name }}</td>
                <td class="text-end">{{ base.items.length }}</td>
                <td>
                  <span v-if="base.warning" class="text-warning-emphasis">{{ base.warning }}</span>
                  <span v-else class="badge text-bg-success">Pronta</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-3 mt-4">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="busy || !importableBases.length"
            @click="saveBases"
          >
            <span v-if="busy" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
            Salvar {{ importableBases.length }} base(s) no sistema
          </button>
          <span v-if="successMessage" class="text-success-emphasis">{{ successMessage }}</span>
        </div>
      </div>
    </div>

    <HistoryCsvImport />
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import HistoryCsvImport from '../components/HistoryCsvImport.vue'
import { parseWorkbook } from '../lib/excelImport'
import { saveImportedBases } from '../apis/countApi'

const bases = ref([])
const busy = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const importableBases = computed(() => bases.value.filter((base) => base.items.length && !base.warning))

async function onFileChange(event) {
  const file = event.target.files?.[0]
  bases.value = []
  successMessage.value = ''
  errorMessage.value = ''
  if (!file) return

  busy.value = true
  try {
    bases.value = await parseWorkbook(file)
    if (!bases.value.length) errorMessage.value = 'A planilha não tem abas.'
  } catch {
    errorMessage.value = 'Não foi possível ler o arquivo. Verifique se é uma planilha Excel válida.'
  } finally {
    busy.value = false
  }
}

async function saveBases() {
  busy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { baseCount, itemCount } = await saveImportedBases(importableBases.value)
    successMessage.value = `${baseCount} base(s) e ${itemCount} item(ns) salvos com sucesso.`
  } catch (error) {
    errorMessage.value = `Não foi possível salvar os dados: ${error.message}`
  } finally {
    busy.value = false
  }
}
</script>
