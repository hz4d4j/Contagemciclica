<template>
  <section>
    <h1 class="h3 mb-1">Conferência de posição</h1>
    <p class="text-body-secondary mb-4">
      Histórico das conferências de posição registradas. Novas conferências são feitas por PN no painel de contagem cíclica.
    </p>

    <PositionCheckList :rows="rows" :loading="loading" :load-error="loadError" @edit="startEdit" />

    <PositionCheckEditModal
      v-if="editing"
      :check="editing"
      :items="items"
      @close="editing = null"
      @saved="onSaved"
    />
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { listCountItems, listPositionChecks } from '../apis/countApi'
import PositionCheckEditModal from '../components/PositionCheckEditModal.vue'
import PositionCheckList from '../components/PositionCheckList.vue'

const rows = ref([])
const items = ref([])
const loading = ref(false)
const loadError = ref('')
const editing = ref(null)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [checks, countItems] = await Promise.all([listPositionChecks(), listCountItems()])
    rows.value = checks
    items.value = countItems
  } catch (error) {
    rows.value = []
    loadError.value = `Não foi possível carregar as conferências: ${error.message}`
  } finally {
    loading.value = false
  }
}

async function startEdit(row) {
  if (!items.value.length) await load()
  editing.value = row
}

async function onSaved() {
  editing.value = null
  await load()
}

onMounted(load)
</script>
