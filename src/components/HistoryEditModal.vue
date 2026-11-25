<template>
  <div>
    <div class="modal-backdrop fade show"></div>
    <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="historyEditTitle">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="historyEditTitle" class="modal-title h5">Editar registro do histórico</h2>
            <button type="button" class="btn-close" aria-label="Fechar" :disabled="saving" @click="emit('close')"></button>
          </div>
          <div class="modal-body">
            <p class="small text-body-secondary mb-3">
              PN <span class="font-monospace fw-semibold">{{ row.pn }}</span> - {{ row.description }}
            </p>
            <div class="row g-3">
              <div class="col-md-4">
                <label for="historyEditDate" class="form-label fw-semibold">Data</label>
                <input id="historyEditDate" v-model="form.date" type="date" class="form-control" :disabled="saving" />
              </div>
              <div class="col-md-4">
                <label for="historyEditMom" class="form-label fw-semibold">Saldo MOM</label>
                <input id="historyEditMom" v-model="form.systemMom" type="number" step="any" inputmode="decimal" class="form-control text-end" :disabled="saving" />
              </div>
              <div class="col-md-4">
                <label for="historyEditQad" class="form-label fw-semibold">Saldo QAD</label>
                <input id="historyEditQad" v-model="form.systemQad" type="number" step="any" inputmode="decimal" class="form-control text-end" :disabled="saving" />
              </div>
              <div class="col-md-4">
                <label for="historyEditCounted" class="form-label fw-semibold">Físico contado</label>
                <input id="historyEditCounted" v-model="form.countedQty" type="number" step="any" inputmode="decimal" class="form-control text-end" :disabled="saving" />
              </div>
              <div class="col-md-4">
                <label for="historyEditAdjustment" class="form-label fw-semibold">Ajustado OK/NOK</label>
                <select id="historyEditAdjustment" v-model="form.adjustment" class="form-select" :disabled="saving">
                  <option value="">Sem ajuste</option>
                  <option value="OK">OK</option>
                  <option value="NOK">NOK</option>
                </select>
              </div>
              <div class="col-12">
                <label for="historyEditNote" class="form-label fw-semibold">Status/Observação</label>
                <input id="historyEditNote" v-model.trim="form.statusNote" type="text" class="form-control" :disabled="saving" />
              </div>
            </div>
            <div v-if="validationMessage" class="form-text mt-3">{{ validationMessage }}</div>
            <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0" role="alert">{{ errorMessage }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="emit('close')">Cancelar</button>
            <button type="button" class="btn btn-primary" :disabled="!isValid || saving" @click="submit">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { updateHistoryRow } from '../apis/countApi'

const props = defineProps({
  row: { type: Object, required: true },
})
const emit = defineEmits(['close', 'saved'])

const form = reactive({
  date: props.row.date ?? '',
  systemMom: props.row.systemMom === null ? '' : String(props.row.systemMom),
  systemQad: props.row.systemQad === null ? '' : String(props.row.systemQad),
  countedQty: props.row.countedQty === null ? '' : String(props.row.countedQty),
  adjustment: props.row.adjustment ?? '',
  statusNote: props.row.statusNote ?? '',
})
const saving = ref(false)
const errorMessage = ref('')

function toNumber(raw) {
  if (raw === '' || raw === null || raw === undefined) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

const validationMessage = computed(() => {
  if (!form.date) return 'Informe a data da contagem.'
  if (toNumber(form.systemMom) === null) return 'Informe o saldo MOM.'
  if (toNumber(form.countedQty) === null) return 'Informe a quantidade física contada.'
  return ''
})
const isValid = computed(() => !validationMessage.value)

async function submit() {
  if (!isValid.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await updateHistoryRow(props.row, {
      date: form.date,
      systemMom: toNumber(form.systemMom),
      systemQad: toNumber(form.systemQad),
      countedQty: toNumber(form.countedQty),
      adjustment: form.adjustment || null,
      statusNote: form.statusNote || null,
    })
    emit('saved')
  } catch (error) {
    errorMessage.value = `Não foi possível salvar o registro: ${error.message}`
  } finally {
    saving.value = false
  }
}
</script>
