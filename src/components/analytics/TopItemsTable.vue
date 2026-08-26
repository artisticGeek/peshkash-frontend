<template>
  <div class="top-items-table">
    <div v-if="loading" class="placeholder-glow py-2">
      <span class="placeholder col-12 rounded mb-2" style="height:28px;"></span>
      <span v-for="n in 4" :key="n" class="placeholder col-12 rounded mb-1" style="height:22px;"></span>
    </div>

    <div v-else-if="error" class="text-muted small py-2">
      <i class="bi bi-exclamation-circle me-1"></i>Could not load item data.
    </div>

    <div v-else-if="!rows.length" class="text-center py-3 text-muted">
      <i class="bi bi-box-seam d-block fs-3 mb-2 opacity-25"></i>
      <p class="small mb-1 fw-medium">No activity yet.</p>
      <p class="small mb-0">Analytics will appear when customers scan or view items.</p>
    </div>

    <div v-else class="table-responsive">
      <table class="table table-sm align-middle mb-0 top-items-tbl">
        <thead class="table-light">
          <tr>
            <th>#</th>
            <th>Item / Product</th>
            <th v-if="showVendor">Vendor</th>
            <th v-if="showEvent">Event</th>
            <th class="text-center">Views</th>
            <th class="text-center">Actions</th>
            <th class="text-center">Rate</th>
            <th class="text-end">Last Activity</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="row.itemId">
            <td class="rank-cell text-muted small">{{ i + 1 }}</td>
            <td>
              <div class="fw-medium small">{{ row.itemName }}</div>
              <span v-if="row.itemType && row.itemType !== 'item'" class="badge bg-light text-secondary border" style="font-size:0.65rem;">{{ row.itemType }}</span>
            </td>
            <td v-if="showVendor" class="text-muted small">{{ row.vendorName || '—' }}</td>
            <td v-if="showEvent" class="text-muted small">{{ row.eventName || '—' }}</td>
            <td class="text-center fw-medium">{{ row.views }}</td>
            <td class="text-center">{{ row.actions }}</td>
            <td class="text-center">
              <span :class="row.views ? 'text-success fw-medium' : 'text-muted'">
                {{ row.views ? Math.round((row.actions / row.views) * 100) + '%' : '—' }}
              </span>
            </td>
            <td class="text-end text-muted small">{{ formatDate(row.lastActivity) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

interface ItemRow {
  itemId: number; itemName: string; itemType: string;
  vendorName: string; eventName: string;
  views: number; actions: number; lastActivity: string;
}

const props = defineProps<{
  range: string;
  vendorId?: number;
  eventId?: number;
  showVendor?: boolean;
  showEvent?: boolean;
}>();

const loading = ref(false);
const error = ref(false);
const rows = ref<ItemRow[]>([]);

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

async function load() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string | number> = { range: props.range };
    if (props.vendorId) params.vendorId = props.vendorId;
    if (props.eventId)  params.eventId  = props.eventId;
    const { data } = await axios.get<{ topItemsDetailed: ItemRow[] }>(
      `${API_BASE_URL}/analytics/summary`, { params }
    );
    rows.value = data.topItemsDetailed ?? [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(() => [props.range, props.vendorId, props.eventId], load);
onMounted(load);
</script>

<style scoped>
.top-items-tbl th { font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
.top-items-tbl td { font-size: 0.82rem; }
.rank-cell { width: 24px; }
</style>
