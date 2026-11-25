<template>
  <section>
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Histórico de contagem</h1>
        <p class="text-body-secondary mb-0">Todas as contagens, da mais recente para a mais antiga.</p>
      </div>
      <input
        v-model.trim="search"
        type="search"
        class="form-control search-input"
        placeholder="Buscar código, descrição ou responsável"
        aria-label="Buscar no histórico"
      />
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div>
    </div>
    <div v-else-if="loadError" class="alert alert-danger" role="alert">{{ loadError }}</div>
    <div v-else-if="!history.length" class="alert alert-secondary" role="status">
      Ainda não há contagens registradas.
    </div>

    <template v-else>
      <p class="small text-body-secondary mb-2">{{ filtered.length }} registro(s)</p>
      <div v-if="!filtered.length" class="alert alert-secondary" role="status">
        Nenhum registro encontrado para a busca.
      </div>
      <div v-else class="card shadow-sm">
        <div class="table-responsive table-scroll">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">PN</th>
                <th scope="col">Descrição</th>
                <th scope="col">ABC</th>
                <th scope="col" class="text-end">Saldo MOM</th>
                <th scope="col" class="text-end">Saldo QAD</th>
                <th scope="col" class="text-end">Físico Contado</th>
                <th scope="col" class="text-end">Variação Física x QAD</th>
                <th scope="col" class="text-end">Variação Física x JFK</th>
                <th scope="col">Ajustado OK/NOK</th>
                <th scope="col">Status/Observação</th>
                <th scope="col">Responsável</th>
                <th scope="col"><span class="visually-hidden">Ação</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filtered" :key="row.key">
                <td class="text-nowrap">{{ formatDate(row.date) }}</td>
                <td class="font-monospace">{{ row.pn }}</td>
                <td>{{ row.description }}</td>
                <td><span class="badge text-bg-secondary">{{ row.abc ?? '-' }}</span></td>
                <td class="text-end">{{ formatQty(row.systemMom) }}</td>
                <td class="text-end">{{ formatQty(row.systemQad) }}</td>
                <td class="text-end">{{ formatQty(row.countedQty) }}</td>
                <td class="text-end" :class="varianceClass(row.varianceQad)">{{ formatVariance(row.varianceQad) }}</td>
                <td class="text-end" :class="varianceClass(row.varianceJfk)">{{ formatVariance(row.varianceJfk) }}</td>
                <td>{{ row.adjustment || '-' }}</td>
                <td>{{ row.statusNote || '-' }}</td>
                <td>{{ row.operator || '-' }}</td>
                <td class="text-end">
                  <button type="button" class="btn btn-sm btn-outline-primary" :aria-label="`Editar registro de ${row.pn}`" @click="editingRow = row">Editar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <HistoryEditModal
      v-if="editingRow"
      :row="editingRow"
      @close="editingRow = null"
      @saved="onSaved"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { loadHistoryRows } from '../apis/countApi'
import HistoryEditModal from '../components/HistoryEditModal.vue'

const history = ref([])
const search = ref('')
const loading = ref(true)
const loadError = ref('')
const editingRow = ref(null)

const filtered = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return history.value
  return history.value.filter((row) =>
    [row.pn, row.description, row.operator]
      .some((field) => field?.toLowerCase().includes(term)),
  )
})

function formatQty(value) {
  if (value === null || value === undefined) return '-'
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

function formatVariance(value) {
  if (value === null || value === undefined) return '-'
  const formatted = formatQty(value)
  return value > 0 ? `+${formatted}` : formatted
}

function varianceClass(value) {
  if (value === null || value === undefined) return 'text-body-secondary'
  if (value === 0) return 'text-success-emphasis'
  return 'text-danger-emphasis fw-semibold'
}

function formatDate(iso) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    history.value = await loadHistoryRows()
  } catch (error) {
    loadError.value = `Não foi possível carregar o histórico: ${error.message}`
  } finally {
    loading.value = false
  }
}

async function onSaved() {
  editingRow.value = null
  await load()
}

onMounted(load)
</script>

<style scoped>
.search-input {
  max-width: 320px;
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
  .search-input {
    max-width: 100%;
  }
}
</style>
