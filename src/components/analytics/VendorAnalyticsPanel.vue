<template>
  <div class="scoped-analytics-panel">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <div>
        <h6 class="fw-bold mb-0">
          <i class="bi bi-bar-chart-line me-2 text-primary"></i>Analytics — {{ vendorName }}
        </h6>
        <p v-if="lastActivityLabel" class="text-muted small mb-0">Last activity: {{ lastActivityLabel }}</p>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <div class="btn-group btn-group-sm">
          <button v-for="r in RANGES" :key="r.value" type="button" class="btn btn-outline-secondary"
            :class="{ active: range === r.value }" @click="setRange(r.value)">{{ r.label }}</button>
        </div>
        <button class="btn btn-sm btn-outline-secondary" @click="load" :disabled="loading" title="Refresh">
          <i class="bi bi-arrow-clockwise" :class="{ spin: loading }"></i>
        </button>
        <button
          class="btn btn-sm btn-outline-success"
          :disabled="exportLoading"
          title="Export raw analytics to Excel"
          @click="exportVendor(props.vendorId, props.vendorName)"
        >
          <i class="bi bi-file-earmark-spreadsheet me-1"></i>
          <span v-if="exportLoading"><i class="bi bi-arrow-clockwise spin me-1"></i>Exporting…</span>
          <span v-else>Excel</span>
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="$emit('close')" title="Close analytics">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="row g-2 mb-3">
      <div v-for="n in 4" :key="n" class="col-6 col-md-3">
        <div class="card border-0 shadow-sm placeholder-glow" style="height:80px;border-radius:10px;">
          <div class="card-body"><span class="placeholder col-8 rounded"></span></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-warning py-2 small">
      <i class="bi bi-exclamation-triangle me-1"></i>Analytics unavailable.
    </div>

    <!-- Empty state -->
    <div v-else-if="!summary || summary.totalScans === 0" class="text-center py-4 text-muted">
      <i class="bi bi-qr-code-scan fs-2 d-block mb-2 opacity-25"></i>
      <p class="mb-1 small fw-medium">No scans yet.</p>
      <p class="mb-0 small">Analytics will appear after customers scan this vendor's QR.</p>
    </div>

    <!-- Data -->
    <template v-else-if="summary">
      <!-- Summary sentence -->
      <p class="summary-sentence mb-3">
        <strong>{{ vendorName }}</strong> received
        <strong>{{ summary.totalScans }} scan{{ summary.totalScans !== 1 ? 's' : '' }}</strong> and
        <strong>{{ summary.totalActions }} customer action{{ summary.totalActions !== 1 ? 's' : '' }}</strong>
        in the selected period.
        <span v-if="engagementRate > 0"> Engagement rate: <strong>{{ engagementRate }}%</strong>.</span>
      </p>

      <!-- KPIs -->
      <div class="row g-2 mb-3">
        <div class="col-6 col-md-3">
          <KpiCard label="Scans" :value="summary.totalScans" icon="bi-qr-code-scan" icon-class="text-primary" />
        </div>
        <div class="col-6 col-md-3">
          <KpiCard label="Customer Actions" :value="summary.totalActions" icon="bi-cursor-fill" icon-class="text-success" />
        </div>
        <div class="col-6 col-md-3">
          <KpiCard label="Engagement Rate" :value="engagementRate" :subtitle="engagementRate + '% actions from scans'"
            icon="bi-arrow-repeat" icon-class="text-purple" />
        </div>
        <div class="col-6 col-md-3">
          <KpiCard label="WhatsApp Clicks" :value="actionCount('whatsapp_click')"
            icon="bi-whatsapp" icon-class="text-success" />
        </div>
      </div>

      <!-- Contact actions + Scans chart -->
      <div class="row g-2 mb-3">
        <div class="col-12 col-md-5">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h6 class="fw-semibold mb-3 small text-uppercase text-muted">Contact Actions</h6>
              <div v-for="key in CONTACT_ACTIONS" :key="key" class="d-flex justify-content-between align-items-center mb-2">
                <span class="small">{{ ACTION_LABEL[key] }}</span>
                <span class="badge bg-light text-dark border">{{ actionCount(key) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-7">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h6 class="fw-semibold mb-2 small text-uppercase text-muted">Scans Over Time</h6>
              <ScanChart :data="summary.scansPerDay" />
            </div>
          </div>
        </div>
      </div>

      <!-- Top QR codes -->
      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <h6 class="fw-semibold mb-3 small text-uppercase text-muted">Top QR Codes</h6>
          <div v-if="summary.topQrDetails.length" class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead class="table-light">
                <tr><th>Target</th><th class="text-center">Scans</th><th class="text-center">Actions</th><th class="text-center">Rate</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in summary.topQrDetails" :key="row.qrHash">
                  <td>
                    <div class="fw-medium small">{{ row.targetName }}</div>
                    <code class="text-muted" style="font-size:0.68rem;">{{ row.qrHash }}</code>
                  </td>
                  <td class="text-center">{{ row.scans }}</td>
                  <td class="text-center">{{ row.actions }}</td>
                  <td class="text-center">
                    <span :class="row.scans ? 'text-success fw-medium' : 'text-muted'">
                      {{ row.scans ? Math.round((row.actions / row.scans) * 100) + '%' : '—' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-muted small mb-0">No QR data yet.</p>
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
import { useAnalyticsExport } from '../../composables/useAnalyticsExport';

const props = defineProps<{ vendorId: number; vendorName: string }>();
defineEmits<{ (e: 'close'): void }>();

const { exportVendor, loading: exportLoading } = useAnalyticsExport();

const RANGES = [
  { label: '7D', value: '7d' }, { label: '30D', value: '30d' },
  { label: '90D', value: '90d' }, { label: 'All', value: 'all' },
] as const;
type RangeValue = typeof RANGES[number]['value'];

const CONTACT_ACTIONS = ['whatsapp_click', 'call_click', 'directions_click', 'save_contact', 'share_click'] as const;
const ACTION_LABEL: Record<string, string> = {
  whatsapp_click: 'WhatsApp', call_click: 'Phone Call', directions_click: 'Directions',
  save_contact: 'Save Contact', share_click: 'Share',
};

interface QrDetail { qrHash: string; qrType: string; targetName: string; scans: number; actions: number; lastActivity: string; }
interface Summary {
  totalScans: number; totalActions: number;
  scansPerDay: Array<{ date: string; count: number }>;
  topQrDetails: QrDetail[];
  actionBreakdown: Array<{ actionType: string; count: number }>;
  lastActivity: string | null;
}

const loading = ref(false);
const error = ref(false);
const summary = ref<Summary | null>(null);
const range = ref<RangeValue>('30d');

const engagementRate = computed(() => {
  const s = summary.value?.totalScans ?? 0;
  return s ? Math.round(((summary.value?.totalActions ?? 0) / s) * 100) : 0;
});

function actionCount(type: string): number {
  return summary.value?.actionBreakdown.find(a => a.actionType === type)?.count ?? 0;
}

const lastActivityLabel = computed(() => {
  const iso = summary.value?.lastActivity;
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
    const { data } = await axios.get<Summary>(`${API_BASE_URL}/analytics/summary`, {
      params: { range: range.value, vendorId: props.vendorId },
    });
    summary.value = data;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(() => props.vendorId, load);
onMounted(load);
</script>

<style scoped>
.scoped-analytics-panel { padding: 1rem; background: var(--bs-body-bg, #fff); }
.summary-sentence { font-size: 0.9rem; color: var(--bs-secondary-color, #6c757d); line-height: 1.6; }
.text-purple { color: #7c3aed; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.btn-group .btn.active { background-color: var(--bs-primary); color: #fff; border-color: var(--bs-primary); }
</style>
