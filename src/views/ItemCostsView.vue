<template>
  <section>
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Custos dos itens</h1>
        <p class="text-body-secondary mb-0">Classe ABC e custo unitário em dólar (USD) de cada item.</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <input
          v-model.trim="search"
          type="search"
          class="form-control search-input"
          placeholder="Buscar PN, descrição ou fornecedor"
          aria-label="Buscar itens"
        />
        <select v-model="abcFilter" class="form-select abc-select" aria-label="Filtrar por classe ABC">
          <option value="">Todas as classes</option>
          <option value="A">Classe A</option>
          <option value="B">Classe B</option>
          <option value="C">Classe C</option>
          <option value="none">Sem classe</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div>
    </div>
    <div v-else-if="loadError" class="alert alert-danger" role="alert">{{ loadError }}</div>
    <div v-else-if="!items.length" class="alert alert-secondary" role="status">
      Nenhum item de custo cadastrado.
    </div>

    <template v-else>
      <div class="row g-3 mb-4">
        <div v-for="card in summaryCards" :key="card.label" class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <small class="text-body-secondary">{{ card.label }}</small>
              <div class="h4 mb-0 mt-1">{{ card.value }}</div>
            </div>
          </div>
        </div>
      </div>

      <p class="small text-body-secondary mb-2">{{ filtered.length }} item(ns)</p>
      <div v-if="!filtered.length" class="alert alert-secondary" role="status">
        Nenhum item encontrado para o filtro selecionado.
      </div>
      <div v-else class="card shadow-sm">
        <div class="table-responsive table-scroll">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">PN</th>
                <th scope="col">Descrição</th>
                <th scope="col">Fornecedor</th>
                <th scope="col">ABC</th>
                <th scope="col" class="text-end">Custo unitário (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filtered" :key="item.pn">
                <td class="font-monospace">{{ item.pn }}</td>
                <td>{{ item.description }}</td>
                <td>{{ item.supplier || '-' }}</td>
                <td><span class="badge text-bg-secondary">{{ item.abc ?? '-' }}</span></td>
                <td class="text-end">{{ formatUsd(item.unitCostUsd) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { loadItemCosts } from '../apis/countApi'
import { formatUsd } from '../lib/currency'

const items = ref([])
const search = ref('')
const abcFilter = ref('')
const loading = ref(true)
const loadError = ref('')

const filtered = computed(() => {
  const term = search.value.toLowerCase()
  return items.value.filter((item) => {
    if (abcFilter.value === 'none' && item.abc) return false
    if (abcFilter.value && abcFilter.value !== 'none' && item.abc !== abcFilter.value) return false
    if (!term) return true
    return [item.pn, item.description, item.supplier].some((field) => field?.toLowerCase().includes(term))
  })
})

const summaryCards = computed(() => {
  const total = items.value.reduce((sum, item) => sum + item.unitCostUsd, 0)
  const average = items.value.length ? total / items.value.length : 0
  const classA = items.value.filter((item) => item.abc === 'A').length
  return [
    { label: 'Itens cadastrados', value: items.value.length.toLocaleString('pt-BR') },
    { label: 'Itens classe A', value: classA.toLocaleString('pt-BR') },
    { label: 'Custo médio por item', value: formatUsd(average) },
    { label: 'Soma dos custos unitários', value: formatUsd(total) },
  ]
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    items.value = await loadItemCosts()
  } catch (error) {
    loadError.value = `Não foi possível carregar os custos dos itens: ${error.message}`
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.search-input {
  max-width: 320px;
}

.abc-select {
  max-width: 200px;
}

.table-scroll {
  max-height: 70vh;
  overflow: auto;
}

.table-scroll thead th {
  position: sticky;
  top: 0;
  z-index: 1;
}

@media (max-width: 767px) {
  .search-input,
  .abc-select {
    max-width: 100%;
  }
}
</style>
