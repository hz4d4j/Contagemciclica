<template>
  <div class="card shadow-sm h-100">
    <div class="card-body">
      <h2 class="h5 mb-3">Conferências registradas</h2>
      <div v-if="loading" class="text-center py-4">
        <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div>
      </div>
      <div v-else-if="loadError" class="alert alert-danger mb-0" role="alert">{{ loadError }}</div>
      <div v-else-if="!rows.length" class="alert alert-secondary mb-0" role="status">
        Nenhuma conferência registrada ainda.
      </div>
      <div v-else class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">PN</th>
              <th scope="col">Responsável</th>
              <th scope="col" class="text-end">Verificados</th>
              <th scope="col" class="text-end">OK</th>
              <th scope="col" class="text-end">Não OK</th>
              <th scope="col">Ocorrência detectada</th>
              <th scope="col">Plano de ação</th>
              <th scope="col"><span class="visually-hidden">Ação</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td class="text-nowrap">{{ formatIsoDate(row.check_date) }}</td>
              <td class="font-monospace">{{ row.count_items?.sku ?? 'Geral' }}</td>
              <td>{{ row.operator_name }}</td>
              <td class="text-end">{{ row.locations_checked }}</td>
              <td class="text-end text-success-emphasis">{{ row.locations_ok }}</td>
              <td class="text-end" :class="row.locations_not_ok ? 'text-danger-emphasis fw-semibold' : 'text-body-secondary'">
                {{ row.locations_not_ok }}
              </td>
              <td class="small">{{ row.occurrence || '-' }}</td>
              <td class="small">{{ row.action_plan || '-' }}</td>
              <td class="text-end">
                <button type="button" class="btn btn-sm btn-outline-primary" @click="emit('edit', row)">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatIsoDate } from '../lib/dates'

defineProps({
  rows: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  loadError: { type: String, default: '' },
})
const emit = defineEmits(['edit'])
</script>
