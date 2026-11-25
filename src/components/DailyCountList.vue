<template>
  <div class="card shadow-sm">
    <div class="card-body">
      <div v-if="loading" class="text-center py-4">
        <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div>
      </div>
      <div v-else-if="loadError" class="alert alert-danger mb-0" role="alert">{{ loadError }}</div>
      <div v-else-if="!rows.length" class="alert alert-secondary mb-0" role="status">
        Nenhuma contagem agendada para esta data.
      </div>

      <template v-else>
        <p class="small text-body-secondary mb-3">{{ doneCount }} de {{ rows.length }} contagens concluídas</p>
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0 count-table">
            <thead>
              <tr>
                <th scope="col">PN</th>
                <th scope="col">Descrição</th>
                <th scope="col">ABC</th>
                <th scope="col">Última contagem</th>
                <th scope="col" class="num-col">Saldo MOM</th>
                <th scope="col" class="num-col">QAD Físico</th>
                <th scope="col" class="num-col">Qtd física contada</th>
                <th scope="col" class="num-col">Variação Física x QAD</th>
                <th scope="col" class="num-col">Variação Física x JFK</th>
                <th scope="col">Ajustado</th>
                <th scope="col">Observação</th>
                <th scope="col"><span class="visually-hidden">Ação</span></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="row in rows" :key="row.id">
              <tr :class="{ 'table-success': row.status === 'completed' }">
                <td class="font-monospace text-nowrap">
                  <div class="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      :disabled="row.status !== 'pending'"
                      :aria-label="`Editar PN ${row.item.sku}`"
                      @click="editingRow = row"
                    >
                      Editar
                    </button>
                    <span>{{ row.item.sku }}</span>
                  </div>
                </td>
                <td>{{ row.item.description }}</td>
                <td><span class="badge text-bg-secondary">{{ row.item.abc_class ?? '-' }}</span></td>
                <td class="text-nowrap">{{ formatIsoDate(row.lastCountedAt) }}</td>

                  <td>
                    <input
                      v-model="drafts[row.id].momQty"
                      type="number"
                      step="any"
                      inputmode="decimal"
                      class="form-control form-control-sm text-end"
                      :aria-label="`Saldo MOM de ${row.item.sku}`"
                      :disabled="savingId === row.id"
                    />
                  </td>
                  <td>
                    <input
                      v-model="drafts[row.id].qadQty"
                      type="number"
                      step="any"
                      inputmode="decimal"
                      class="form-control form-control-sm text-end"
                      :aria-label="`QAD Físico de ${row.item.sku}`"
                      :disabled="savingId === row.id"
                    />
                  </td>
                  <td>
                    <input
                      v-model="drafts[row.id].countedQty"
                      type="number"
                      step="any"
                      inputmode="decimal"
                      class="form-control form-control-sm text-end"
                      :aria-label="`Quantidade física contada de ${row.item.sku}`"
                      :disabled="savingId === row.id"
                    />
                  </td>
                  <td class="text-end" :class="varianceClass(varianceQad(drafts[row.id]))">
                    {{ formatVariance(varianceQad(drafts[row.id])) }}
                  </td>
                  <td class="text-end" :class="varianceClass(varianceJfk(drafts[row.id]))">
                    {{ formatVariance(varianceJfk(drafts[row.id])) }}
                  </td>
                  <td>
                    <select
                      v-model="drafts[row.id].adjustment"
                      class="form-select form-select-sm"
                      :aria-label="`Ajustado de ${row.item.sku}`"
                      :disabled="savingId === row.id"
                    >
                      <option value="">Selecione</option>
                      <option value="OK">OK</option>
                      <option value="NOK">NOK</option>
                    </select>
                  </td>
                  <td>
                    <input
                      v-model.trim="drafts[row.id].observation"
                      type="text"
                      class="form-control form-control-sm"
                      :aria-label="`Observação de ${row.item.sku}`"
                      :disabled="savingId === row.id"
                    />
                  </td>
                  <td class="text-end text-nowrap">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary me-1"
                      :aria-expanded="openPositionId === row.id"
                      :aria-label="`Conferência de posição de ${row.item.sku}`"
                      @click="togglePosition(row.id)"
                    >
                      {{ openPositionId === row.id ? 'Fechar posição' : 'Posição' }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-success"
                      :disabled="savingId !== null || !canConfirm(row.id)"
                      @click="confirm(row)"
                    >
                      <span v-if="savingId === row.id" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      <span v-else>{{ row.status === 'completed' ? 'Salvar' : 'Confirmar' }}</span>
                    </button>
                  </td>
              </tr>
              <tr v-if="openPositionId === row.id" class="position-row">
                <td colspan="12" class="bg-body-tertiary">
                  <ItemPositionCheck :count-item-id="row.item.id" :operator-name="operatorName" />
                </td>
              </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0" role="alert">{{ errorMessage }}</div>
      </template>
    </div>
    <PnEditModal
      v-if="editingRow"
      :plan-id="editingRow.id"
      :base-id="editingRow.baseId"
      :current-item-id="editingRow.item.id"
      :taken-item-ids="takenItemIds"
      @close="editingRow = null"
      @saved="onPnChanged"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { completeItemCount } from '../apis/countApi'
import { formatIsoDate } from '../lib/dates'
import ItemPositionCheck from './ItemPositionCheck.vue'
import PnEditModal from './PnEditModal.vue'

const props = defineProps({
  rows: { type: Array, required: true },
  operatorName: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  loadError: { type: String, default: '' },
})
const emit = defineEmits(['counted', 'changed'])

const drafts = reactive({})
const savingId = ref(null)
const errorMessage = ref('')
const openPositionId = ref(null)
const editingRow = ref(null)

const takenItemIds = computed(() => props.rows.map((row) => row.item.id))

function togglePosition(id) {
  openPositionId.value = openPositionId.value === id ? null : id
}

function onPnChanged() {
  editingRow.value = null
  emit('changed')
}

const doneCount = computed(() => props.rows.filter((row) => row.status === 'completed').length)

function draftFor(row) {
  const result = row.result
  if (!result) return { momQty: '', qadQty: '', countedQty: '', adjustment: '', observation: '' }
  return {
    momQty: String(result.system_qty),
    qadQty: result.qad_qty === null ? '' : String(result.qad_qty),
    countedQty: String(result.counted_qty),
    adjustment: result.adjustment ?? '',
    observation: result.observation ?? '',
  }
}

function toNumber(raw) {
  if (raw === '' || raw === null || raw === undefined) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function varianceQad(source) {
  if (!source) return null
  const counted = toNumber(source.countedQty ?? source.counted_qty)
  const qad = toNumber(source.qadQty ?? source.qad_qty)
  if (counted === null || qad === null) return null
  return counted - qad
}

function varianceJfk(source) {
  if (!source) return null
  const counted = toNumber(source.countedQty ?? source.counted_qty)
  const mom = toNumber(source.momQty ?? source.system_qty)
  if (counted === null || mom === null) return null
  return counted - mom
}

function canConfirm(id) {
  const draft = drafts[id]
  return (
    !!props.operatorName &&
    toNumber(draft.momQty) !== null &&
    toNumber(draft.qadQty) !== null &&
    toNumber(draft.countedQty) !== null &&
    (draft.adjustment === 'OK' || draft.adjustment === 'NOK')
  )
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

function formatVariance(value) {
  if (value === null) return '-'
  if (value > 0) return `+${formatNumber(value)}`
  return formatNumber(value)
}

function varianceClass(value) {
  if (value === null) return 'text-body-secondary'
  return value === 0 ? 'text-success-emphasis' : 'text-danger-emphasis fw-semibold'
}

async function confirm(row) {
  const draft = drafts[row.id]
  savingId.value = row.id
  errorMessage.value = ''
  try {
    await completeItemCount(
      row,
      row.item,
      {
        momQty: toNumber(draft.momQty),
        qadQty: toNumber(draft.qadQty),
        countedQty: toNumber(draft.countedQty),
        adjustment: draft.adjustment,
        observation: draft.observation || null,
      },
      props.operatorName,
    )
    emit('counted', row.id)
  } catch (error) {
    errorMessage.value = `Não foi possível concluir a contagem: ${error.message}`
  } finally {
    savingId.value = null
  }
}

watch(
  () => props.rows,
  (rows) => {
    for (const row of rows) {
      if (!drafts[row.id]) drafts[row.id] = draftFor(row)
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.count-table {
  min-width: 1100px;
}

.count-table .num-col {
  min-width: 120px;
}
</style>
