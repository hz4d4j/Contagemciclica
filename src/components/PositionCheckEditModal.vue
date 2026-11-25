<template>
  <div>
    <div class="modal-backdrop fade show"></div>
    <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="positionEditTitle">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="positionEditTitle" class="modal-title h5">Editar conferência de posição</h2>
            <button type="button" class="btn-close" aria-label="Fechar" :disabled="saving" @click="emit('close')"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label for="editPositionItem" class="form-label fw-semibold">PN</label>
                <select id="editPositionItem" v-model="form.countItemId" class="form-select" :disabled="saving">
                  <option value="">Geral (sem PN)</option>
                  <option v-for="item in items" :key="item.id" :value="item.id">{{ item.sku }} - {{ item.description }}</option>
                </select>
              </div>
              <div class="col-md-3">
                <label for="editPositionDate" class="form-label fw-semibold">Data</label>
                <input id="editPositionDate" v-model="form.checkDate" type="date" class="form-control" :disabled="saving" />
              </div>
              <div class="col-md-3">
                <label for="editPositionOperator" class="form-label fw-semibold">Responsável</label>
                <input id="editPositionOperator" v-model.trim="form.operatorName" type="text" class="form-control" :disabled="saving" />
              </div>
              <div class="col-md-4">
                <label for="editPositionChecked" class="form-label fw-semibold">Lugares verificados</label>
                <input id="editPositionChecked" v-model="form.locationsChecked" type="number" min="1" step="1" inputmode="numeric" class="form-control" :disabled="saving" />
              </div>
              <div class="col-md-4">
                <label for="editPositionOk" class="form-label fw-semibold">Lugares OK</label>
                <input id="editPositionOk" v-model="form.locationsOk" type="number" min="0" step="1" inputmode="numeric" class="form-control" :disabled="saving" />
              </div>
              <div class="col-md-4">
                <label for="editPositionNok" class="form-label fw-semibold">Lugares não OK</label>
                <input id="editPositionNok" v-model="form.locationsNotOk" type="number" min="0" step="1" inputmode="numeric" class="form-control" :disabled="saving" />
              </div>
              <div class="col-12">
                <label for="editPositionOccurrence" class="form-label fw-semibold">Ocorrência detectada</label>
                <input id="editPositionOccurrence" v-model.trim="form.occurrence" type="text" class="form-control" :disabled="saving" />
              </div>
              <div class="col-12">
                <label for="editPositionPlan" class="form-label fw-semibold">Plano de ação</label>
                <input id="editPositionPlan" v-model.trim="form.actionPlan" type="text" class="form-control" placeholder="Obrigatório quando houver lugares não OK" :disabled="saving" />
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
import { updatePositionCheck } from '../apis/countApi'
import { positionCheckError, positionCheckPayload } from '../lib/positionCheck'

const props = defineProps({
  check: { type: Object, required: true },
  items: { type: Array, required: true },
})
const emit = defineEmits(['close', 'saved'])

const form = reactive({
  countItemId: props.check.count_item_id ?? '',
  checkDate: props.check.check_date,
  operatorName: props.check.operator_name,
  locationsChecked: String(props.check.locations_checked),
  locationsOk: String(props.check.locations_ok),
  locationsNotOk: String(props.check.locations_not_ok),
  occurrence: props.check.occurrence ?? '',
  actionPlan: props.check.action_plan ?? '',
})
const saving = ref(false)
const errorMessage = ref('')

const validationMessage = computed(() => positionCheckError(form))
const isValid = computed(() => !validationMessage.value)

async function submit() {
  if (!isValid.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await updatePositionCheck(
      props.check.id,
      positionCheckPayload(form, { countItemId: form.countItemId || null }),
    )
    emit('saved')
  } catch (error) {
    errorMessage.value = `Não foi possível salvar as alterações: ${error.message}`
  } finally {
    saving.value = false
  }
}
</script>
