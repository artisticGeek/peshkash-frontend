<template>
  <div class="item-analytics-panel">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <div>
        <h6 class="fw-bold mb-0">
          <i class="bi bi-graph-up me-2 text-primary"></i>{{ itemName }}
          <span v-if="itemType && itemType !== 'item'" class="badge bg-light text-secondary border ms-2" style="font-size:0.65rem;">{{ itemType }}</span>
        </h6>
        <p v-if="lastActivityLabel" class="text-muted small mb-0">Last activity: {{ lastActivityLabel }}</p>
        <p v-else class="text-muted small mb-0">No activity recorded yet</p>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <div class="btn-group btn-group-sm">
          <button v-for="r in RANGES" :key="r.value" type="button" class="btn btn-outline-secondary"
            :class="{ active: range === r.value }" @click="setRange(r.value)">{{ r.label }}</button>
        </div>
        <button class="btn btn-sm btn-outline-secondary" @click="load" :disabled="loading" title="Refresh">
          <i class="bi bi-arrow-clockwise" :class="{ spin: loading }"></i>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="row g-2 mb-3">
      <div v-for="n in 4" :key="n" class="col-6 col-sm-3">
        <div class="card border-0 shadow-sm placeholder-glow" style="height:80px;border-radius:10px;">
          <div class="card-body"><span class="placeholder col-8 rounded"></span></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-warning py-2 small">
      <i class="bi bi-exclamation-triangle me-1"></i>Analytics unavailable.
    </div>

    <!-- Empty -->
    <div v-else-if="!data || (data.totalViews === 0 && data.totalActions === 0)"
      class="text-center py-4 text-muted">
      <i class="bi bi-eye-slash fs-2 d-block mb-2 opacity-25"></i>
      <p class="mb-1 small fw-medium">No activity yet.</p>
      <p class="mb-0 small">Analytics will appear when customers scan or view this item.</p>
    </div>

    <!-- Data -->
    <template v-else-if="data">
      <!-- KPIs -->
      <div class="row g-2 mb-3">
        <div class="col-6 col-sm-3">
          <KpiCard label="Views" :value="data.totalViews" icon="bi-eye" icon-class="text-primary" />
        </div>
        <div class="col-6 col-sm-3">
          <KpiCard label="Actions" :value="data.totalActions" icon="bi-cursor-fill" icon-class="text-success" />
        </div>
        <div class="col-6 col-sm-3">
          <KpiCard label="Engagement" :value="engagementRate"
            :subtitle="engagementRate + '% from views'"
            icon="bi-arrow-repeat" icon-class="text-purple" />
        </div>
        <div class="col-6 col-sm-3">
          <KpiCard label="WhatsApp" :value="whatsappClicks" icon="bi-whatsapp" icon-class="text-success" />
        </div>
      </div>

      <!-- Chart + Breakdown -->
      <div class="row g-2 mb-3">
        <div class="col-12 col-md-7">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h6 class="fw-semibold mb-2 small text-uppercase text-muted">Views Over Time</h6>
              <!-- Teal accent to distinguish item-views line from QR-scan charts -->
              <ScanChart :data="data.viewsPerDay" label="Item Views" accent-rgb="20, 184, 166" />
            </div>
          </div>
        </div>
        <div class="col-12 col-md-5">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h6 class="fw-semibold mb-3 small text-uppercase text-muted">Actions Breakdown</h6>
              <div v-if="data.actionBreakdown.length">
                <div v-for="row in data.actionBreakdown.slice(0, 8)" :key="row.actionType"
                  class="d-flex justify-content-between align-items-center mb-2">
                  <span class="small">{{ ACTION_LABEL[row.actionType] ?? row.actionType }}</span>
                  <span class="badge bg-light text-dark border">{{ row.count }}</span>
                </div>
              </div>
              <p v-else class="text-muted small mb-0">No actions recorded yet.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Linked QR hashes -->
      <div v-if="data.linkedQrHashes.length" class="card border-0 shadow-sm">
        <div class="card-body">
          <h6 class="fw-semibold mb-3 small text-uppercase text-muted">
            <i class="bi bi-qr-code me-1"></i>Linked QR Codes
          </h6>
          <div class="d-flex flex-wrap gap-2">
            <code v-for="hash in data.linkedQrHashes" :key="hash"
              class="text-muted rounded px-2 py-1 border"
              style="font-size:0.72rem;background:var(--bs-light,#f8f9fa);">
              {{ hash }}
            </code>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import KpiCard from './KpiCard.vue';
import ScanChart from './ScanChart.vue';

const props = defineProps<{
  itemId: number;
  itemName: string;
  itemType?: string;
}>();

const RANGES = [
  { label: '7D', value: '7d' }, { label: '30D', value: '30d' },
  { label: '90D', value: '90d' }, { label: 'All', value: 'all' },
] as const;
type RangeValue = typeof RANGES[number]['value'];

interface ItemAnalytics {
  totalViews: number;
  totalActions: number;
  viewsPerDay: Array<{ date: string; count: number }>;
  actionBreakdown: Array<{ actionType: string; count: number }>;
  lastActivity: string | null;
  linkedQrHashes: string[];
}

const ACTION_LABEL: Record<string, string> = {
  whatsapp_click: 'WhatsApp', call_click: 'Call', email_click: 'Email',
  directions_click: 'Directions', share_click: 'Share', save_contact: 'Save Contact',
  social_click: 'Social', item_expand: 'Description Read', item_detail_view: 'Detail View',
  menu_view: 'Menu View', vendor_contact_view: 'Contact View',
};

const loading = ref(false);
const error = ref(false);
const data = ref<ItemAnalytics | null>(null);
const range = ref<RangeValue>('30d');

const engagementRate = computed(() => {
  const v = data.value?.totalViews ?? 0;
  return v ? Math.round(((data.value?.totalActions ?? 0) / v) * 100) : 0;
});

const whatsappClicks = computed(() =>
  data.value?.actionBreakdown.find(a => a.actionType === 'whatsapp_click')?.count ?? 0
);

const lastActivityLabel = computed(() => {
  const iso = data.value?.lastActivity;
  if (!iso) return null;
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
});

function setRange(v: RangeValue) { range.value = v; load(); }

async function load() {
  loading.value = true;
  error.value = false;
  try {
    const { data: res } = await axios.get<ItemAnalytics>(
      `${API_BASE_URL}/analytics/items/${props.itemId}`,
      { params: { range: range.value } }
    );
    data.value = res;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(() => props.itemId, load);
onMounted(load);
</script>

<style scoped>
.item-analytics-panel { padding: 0.25rem 0; }
.text-purple { color: #7c3aed; }
.btn-group .btn.active { background-color: var(--bs-primary); color: #fff; border-color: var(--bs-primary); }
.spin { animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
