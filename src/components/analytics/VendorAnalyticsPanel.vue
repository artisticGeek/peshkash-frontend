<template>
  <div class="scoped-analytics-panel">

    <!-- Toolbar: last-scan label + range + controls -->
    <div class="d-flex align-items-center gap-2 mb-4 flex-wrap">
      <span v-if="lastActivityLabel" class="text-muted small me-auto">
        <i class="bi bi-clock me-1"></i>Last scan: {{ lastActivityLabel }}
      </span>
      <span v-else class="me-auto" />
      <div class="btn-group btn-group-sm">
        <button v-for="r in RANGES" :key="r.value" type="button" class="btn btn-outline-secondary"
          :class="{ active: range === r.value }" @click="setRange(r.value)">{{ r.label }}</button>
      </div>
      <button class="btn btn-sm btn-outline-secondary" @click="load" :disabled="loading" title="Refresh">
        <i class="bi bi-arrow-clockwise" :class="{ spin: loading }"></i>
      </button>
      <button class="btn btn-sm btn-outline-success" :disabled="exportLoading"
        title="Export raw analytics to Excel" @click="exportVendor(props.vendorId, props.vendorName)">
        <i class="bi bi-file-earmark-spreadsheet me-1"></i>
        <span v-if="exportLoading"><i class="bi bi-arrow-clockwise spin me-1"></i>Exporting…</span>
        <span v-else>Excel</span>
      </button>
      <button class="btn btn-sm btn-outline-secondary" @click="$emit('close')" title="Close analytics">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="row g-3 mb-3">
      <div v-for="n in 3" :key="n" class="col-4">
        <div class="card border-0 shadow-sm placeholder-glow" style="height:90px;border-radius:12px;">
          <div class="card-body"><span class="placeholder col-7 rounded"></span></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-warning py-2 small">
      <i class="bi bi-exclamation-triangle me-1"></i>Analytics unavailable.
    </div>

    <!-- Empty state -->
    <div v-else-if="!summary || summary.totalScans === 0" class="text-center py-5 text-muted">
      <i class="bi bi-qr-code-scan fs-1 d-block mb-3 opacity-25"></i>
      <p class="mb-1 fw-medium">No scans yet</p>
      <p class="mb-0 small">Analytics will appear after customers scan this vendor's QR code.</p>
    </div>

    <!-- Data -->
    <template v-else-if="summary">

      <!-- KPI cards -->
      <div class="row g-3 mb-3">
        <div :class="hasActions ? 'col-4' : 'col-6'">
          <KpiCard label="Scans" :value="summary.totalScans"
            icon="bi-qr-code-scan" icon-class="text-primary" />
        </div>
        <div :class="hasActions ? 'col-4' : 'col-6'">
          <KpiCard label="Actions" :value="summary.totalActions"
            icon="bi-cursor-fill" icon-class="text-success" />
        </div>
        <div v-if="hasActions" class="col-4">
          <div class="kpi-card card border-0 shadow-sm h-100">
            <div class="card-body d-flex flex-column justify-content-between p-3">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <span class="text-muted small text-uppercase fw-semibold">Engagement</span>
                <i class="bi bi-arrow-repeat fs-4 text-purple" style="opacity:0.7;"></i>
              </div>
              <div class="fw-bold" style="font-size:2rem;line-height:1.1;">
                {{ engagementRate }}<span class="fs-5 fw-normal text-muted">%</span>
              </div>
              <div class="text-muted small mt-1">actions per scan</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scans chart + Action breakdown (breakdown only when there are actions) -->
      <div class="row g-3 mb-3">
        <div :class="hasActions ? 'col-12 col-md-7' : 'col-12'">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h6 class="section-label">Scans Over Time</h6>
              <ScanChart :data="summary.scansPerDay" />
            </div>
          </div>
        </div>
        <div v-if="hasActions" class="col-12 col-md-5">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h6 class="section-label">Action Breakdown</h6>
              <ActionBreakdown :data="summary.actionBreakdown" />
            </div>
          </div>
        </div>
      </div>

      <!-- QR Codes -->
      <div v-if="summary.topQrDetails.length" class="card border-0 shadow-sm">
        <div class="card-body">
          <h6 class="section-label">QR Codes</h6>
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Target</th>
                  <th class="text-center">Scans</th>
                  <th class="text-center">Actions</th>
                  <th class="text-center">Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in summary.topQrDetails" :key="row.qrHash">
                  <td class="fw-medium small">{{ row.targetName || '—' }}</td>
                  <td class="text-center">{{ row.scans }}</td>
                  <td class="text-center">{{ row.actions }}</td>
                  <td class="text-center">
                    <span :class="row.actions > 0 ? 'text-success fw-medium' : 'text-muted'">
                      {{ row.scans ? Math.round((row.actions / row.scans) * 100) + '%' : '—' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
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
import ActionBreakdown from './ActionBreakdown.vue';
import { useAnalyticsExport } from '../../composables/useAnalyticsExport';

const props = defineProps<{ vendorId: number; vendorName: string }>();
defineEmits<{ (e: 'close'): void }>();

const { exportVendor, loading: exportLoading } = useAnalyticsExport();

const RANGES = [
  { label: '7D', value: '7d' }, { label: '30D', value: '30d' },
  { label: '90D', value: '90d' }, { label: 'All', value: 'all' },
] as const;
type RangeValue = typeof RANGES[number]['value'];

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

const hasActions = computed(() => (summary.value?.totalActions ?? 0) > 0);

const engagementRate = computed(() => {
  const s = summary.value?.totalScans ?? 0;
  return s ? Math.round(((summary.value?.totalActions ?? 0) / s) * 100) : 0;
});

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
.kpi-card { border-radius: 12px; transition: box-shadow 0.2s; }
.kpi-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.10) !important; }
.section-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--bs-secondary-color, #6c757d);
  margin-bottom: 0.75rem;
}
.text-purple { color: #7c3aed; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.btn-group .btn.active { background-color: var(--bs-primary); color: #fff; border-color: var(--bs-primary); }
</style>
