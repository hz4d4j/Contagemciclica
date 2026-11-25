<template>
  <div>
    <div class="modal-backdrop fade show"></div>
    <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="pnEditTitle">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="pnEditTitle" class="modal-title h5">Editar PN da contagem</h2>
            <button type="button" class="btn-close" aria-label="Fechar" :disabled="saving" @click="emit('close')"></button>
          </div>
          <div class="modal-body">
            <div v-if="loading" class="text-center py-3">
              <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div>
            </div>
            <template v-else>
              <label for="pnEditItem" class="form-label fw-semibold">PN</label>
              <select id="pnEditItem" v-model="selectedId" class="form-select" :disabled="saving">
                <option v-for="item in options" :key="item.id" :value="item.id">{{ item.sku }} - {{ item.description }}</option>
              </select>
              <div class="form-text">Descrição e classe ABC passam a ser as do PN escolhido.</div>
            </template>
            <div v-if="loadError" class="alert alert-danger mt-3 mb-0" role="alert">{{ loadError }}</div>
            <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0" role="alert">{{ errorMessage }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="emit('close')">Cancelar</button>
            <button type="button" class="btn btn-primary" :disabled="loading || saving || selectedId === props.currentItemId" @click="submit">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              Salvar PN
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { changePendingPlanItem, listBaseItems } from '../apis/countApi'

const props = defineProps({
  planId: { type: String, required: true },
  baseId: { type: String, required: true },
  currentItemId: { type: String, required: true },
  takenItemIds: { type: Array, required: true },
})
const emit = defineEmits(['close', 'saved'])

const items = ref([])
const loading = ref(true)
const loadError = ref('')
const selectedId = ref(props.currentItemId)
const saving = ref(false)
const errorMessage = ref('')

const options = computed(() =>
  items.value.filter((item) => item.id === props.currentItemId || !props.takenItemIds.includes(item.id)),
)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    items.value = await listBaseItems(props.baseId)
  } catch (error) {
    loadError.value = `Não foi possível carregar os PNs: ${error.message}`
  } finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true
  errorMessage.value = ''
  try {
    await changePendingPlanItem(props.planId, selectedId.value)
    emit('saved')
  } catch (error) {
    errorMessage.value = `Não foi possível salvar o PN: ${error.message}`
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
