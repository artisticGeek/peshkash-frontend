<template>
  <div class="top-table">
    <div v-if="!rows.length" class="text-muted small py-3 text-center">No data yet</div>
    <table v-else class="table table-sm table-hover mb-0">
      <thead>
        <tr>
          <th class="text-muted small fw-semibold">#</th>
          <th class="text-muted small fw-semibold">{{ labelHeader }}</th>
          <th class="text-muted small fw-semibold text-end">{{ valueHeader }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i">
          <td class="text-muted small">{{ i + 1 }}</td>
          <td class="small fw-medium text-truncate" style="max-width: 180px;">{{ row.label }}</td>
          <td class="text-end small">
            <span class="badge bg-primary-subtle text-primary-emphasis fw-semibold">{{ row.value }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  rows: Array<{ label: string; value: number }>;
  labelHeader?: string;
  valueHeader?: string;
}>(), {
  labelHeader: 'Item',
  valueHeader: 'Count',
});
</script>
