<template>
  <div class="position-check">
    <div class="d-flex flex-wrap align-items-end gap-3">
      <div class="position-field">
        <label :for="`pos-total-${countItemId}`" class="form-label small fw-semibold mb-1">Lugares verificados</label>
        <input :id="`pos-total-${countItemId}`" v-model="form.locationsChecked" type="number" min="1" step="1" inputmode="numeric" class="form-control form-control-sm" :disabled="saving" />
      </div>
      <div class="position-field">
        <label :for="`pos-ok-${countItemId}`" class="form-label small fw-semibold mb-1">Lugares OK</label>
        <input :id="`pos-ok-${countItemId}`" v-model="form.locationsOk" type="number" min="0" step="1" inputmode="numeric" class="form-control form-control-sm" :disabled="saving" />
      </div>
      <div class="position-field">
        <label :for="`pos-nok-${countItemId}`" class="form-label small fw-semibold mb-1">Lugares não OK</label>
        <input :id="`pos-nok-${countItemId}`" v-model="form.locationsNotOk" type="number" min="0" step="1" inputmode="numeric" class="form-control form-control-sm" :disabled="saving" />
      </div>
      <div class="position-occurrence">
        <label :for="`pos-occurrence-${countItemId}`" class="form-label small fw-semibold mb-1">Ocorrência detectada</label>
        <input :id="`pos-occurrence-${countItemId}`" v-model.trim="form.occurrence" type="text" class="form-control form-control-sm" placeholder="Descreva a ocorrência" :disabled="saving" />
      </div>
      <div class="position-plan">
        <label :for="`pos-plan-${countItemId}`" class="form-label small fw-semibold mb-1">Plano de ação</label>
        <input :id="`pos-plan-${countItemId}`" v-model.trim="form.actionPlan" type="text" class="form-control form-control-sm" placeholder="Obrigatório quando houver lugares não OK" :disabled="saving" />
      </div>
      <button type="button" class="btn btn-sm btn-primary" :disabled="!isValid || saving" @click="submit">
        <span v-if="saving" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
        Salvar posição
      </button>
    </div>
    <div v-if="validationMessage" class="form-text mt-2">{{ validationMessage }}</div>
    <div v-if="errorMessage" class="alert alert-danger mt-2 mb-0 py-2" role="alert">{{ errorMessage }}</div>
    <div v-if="savedMessage" class="small text-success-emphasis mt-2" role="status">{{ savedMessage }}</div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { savePositionCheck } from '../apis/countApi'
import { todayIso } from '../lib/dates'
import { positionCheckError, positionCheckPayload } from '../lib/positionCheck'

const props = defineProps({
  countItemId: { type: String, required: true },
  operatorName: { type: String, default: '' },
})

const form = reactive({
  checkDate: todayIso(),
  locationsChecked: '',
  locationsOk: '',
  locationsNotOk: '',
  occurrence: '',
  actionPlan: '',
})
const saving = ref(false)
const errorMessage = ref('')
const savedMessage = ref('')

const checkForm = computed(() => ({ ...form, operatorName: props.operatorName }))
const validationMessage = computed(() => positionCheckError(checkForm.value))
const isValid = computed(() => !validationMessage.value)

async function submit() {
  if (!isValid.value) return
  saving.value = true
  errorMessage.value = ''
  savedMessage.value = ''
  try {
    await savePositionCheck(positionCheckPayload(checkForm.value, { countItemId: props.countItemId }))
    form.locationsChecked = ''
    form.locationsOk = ''
    form.locationsNotOk = ''
    form.occurrence = ''
    form.actionPlan = ''
    savedMessage.value = 'Conferência de posição salva.'
  } catch (error) {
    errorMessage.value = `Não foi possível salvar a conferência: ${error.message}`
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.position-field {
  width: 150px;
}

.position-occurrence {
  flex: 1 1 200px;
}

.position-plan {
  flex: 1 1 200px;
}
</style>
