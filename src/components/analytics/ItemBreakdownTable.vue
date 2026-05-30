<template>
  <div class="item-breakdown">
    <!-- Toolbar -->
    <div class="ibt-toolbar">
      <div class="ibt-search-wrap">
        <i class="bi bi-search ibt-search-icon"></i>
        <input
          v-model="search"
          type="text"
          class="ibt-search"
          placeholder="Search items…"
        />
        <button v-if="search" class="ibt-search-clear" @click="search = ''" aria-label="Clear">
          <i class="bi bi-x"></i>
        </button>
      </div>
      <div class="ibt-meta">
        <span class="text-muted small">{{ sorted.length }} item{{ sorted.length !== 1 ? 's' : '' }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="placeholder-glow py-2">
      <span class="placeholder col-12 rounded mb-2" style="height:30px;"></span>
      <span v-for="n in 5" :key="n" class="placeholder col-12 rounded mb-1" style="height:22px;"></span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-warning py-2 small mt-2">
      <i class="bi bi-exclamation-triangle me-1"></i>Could not load item data.
    </div>

    <!-- Empty state -->
    <div v-else-if="!rows.length" class="ibt-empty">
      <i class="bi bi-box-seam"></i>
      <span>No item interactions recorded yet in this period.</span>
    </div>

    <!-- Table -->
    <div v-else class="table-responsive ibt-table-wrap">
      <table class="table table-sm table-hover align-middle mb-0 ibt-table">
        <thead class="table-light">
          <tr>
            <th class="ibt-th-name">
              <button class="ibt-sort-btn" @click="toggleSort('itemName')">
                Item
                <i class="bi" :class="sortIcon('itemName')"></i>
              </button>
            </th>
            <th class="text-center ibt-col-sm">
              <button class="ibt-sort-btn" @click="toggleSort('expands')" title="Item Expand clicks">
                Expands <i class="bi" :class="sortIcon('expands')"></i>
              </button>
            </th>
            <th class="text-center ibt-col-sm d-none d-sm-table-cell">
              <button class="ibt-sort-btn" @click="toggleSort('detailViews')" title="Item Detail View clicks">
                Detail <i class="bi" :class="sortIcon('detailViews')"></i>
              </button>
            </th>
            <th class="text-center ibt-col-sm d-none d-md-table-cell">
              <button class="ibt-sort-btn" @click="toggleSort('whatsappClicks')" title="WhatsApp clicks">
                <i class="bi bi-whatsapp text-success"></i>
                <i class="bi" :class="sortIcon('whatsappClicks')"></i>
              </button>
            </th>
            <th class="text-center ibt-col-sm d-none d-md-table-cell">
              <button class="ibt-sort-btn" @click="toggleSort('shareClicks')" title="Share clicks">
                Share <i class="bi" :class="sortIcon('shareClicks')"></i>
              </button>
            </th>
            <th class="text-center ibt-col-sm d-none d-lg-table-cell">
              <button class="ibt-sort-btn" @click="toggleSort('directions')" title="Directions clicks">
                Dir. <i class="bi" :class="sortIcon('directions')"></i>
              </button>
            </th>
            <th class="text-center ibt-col-sm d-none d-lg-table-cell">
              <button class="ibt-sort-btn" @click="toggleSort('calls')" title="Call clicks">
                Calls <i class="bi" :class="sortIcon('calls')"></i>
              </button>
            </th>
            <th class="text-center ibt-col-total">
              <button class="ibt-sort-btn" @click="toggleSort('totalActions')">
                Total <i class="bi" :class="sortIcon('totalActions')"></i>
              </button>
            </th>
            <th class="text-end d-none d-sm-table-cell ibt-col-date">
              <button class="ibt-sort-btn" @click="toggleSort('lastActivity')">
                Last <i class="bi" :class="sortIcon('lastActivity')"></i>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in sorted" :key="row.itemId">
            <td class="ibt-td-name">
              <div class="ibt-item-name">{{ row.itemName }}</div>
              <span
                v-if="row.itemType && row.itemType !== 'item'"
                class="ibt-type-badge"
              >{{ row.itemType }}</span>
            </td>
            <td class="text-center">
              <span :class="row.expands ? 'fw-semibold' : 'text-muted'">
                {{ row.expands || '—' }}
              </span>
            </td>
            <td class="text-center d-none d-sm-table-cell">
              <span :class="row.detailViews ? 'fw-semibold' : 'text-muted'">
                {{ row.detailViews || '—' }}
              </span>
            </td>
            <td class="text-center d-none d-md-table-cell">
              <span :class="row.whatsappClicks ? 'text-success fw-semibold' : 'text-muted'">
                {{ row.whatsappClicks || '—' }}
              </span>
            </td>
            <td class="text-center d-none d-md-table-cell">
              <span :class="row.shareClicks ? 'fw-semibold' : 'text-muted'">
                {{ row.shareClicks || '—' }}
              </span>
            </td>
            <td class="text-center d-none d-lg-table-cell">
              <span :class="row.directions ? 'fw-semibold' : 'text-muted'">
                {{ row.directions || '—' }}
              </span>
            </td>
            <td class="text-center d-none d-lg-table-cell">
              <span :class="row.calls ? 'fw-semibold' : 'text-muted'">
                {{ row.calls || '—' }}
              </span>
            </td>
            <td class="text-center">
              <span
                class="ibt-total-badge"
                :class="row.totalActions > 0 ? 'ibt-total-active' : 'ibt-total-zero'"
              >{{ row.totalActions }}</span>
            </td>
            <td class="text-end text-muted small d-none d-sm-table-cell">
              {{ formatDate(row.lastActivity) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Column legend on mobile -->
    <div class="ibt-legend d-sm-none">
      <span><strong>Exp</strong> = Item Expands</span>
      <span class="ms-3"><strong>Tot</strong> = Total Actions</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

interface ItemRow {
  itemId: number;
  itemName: string;
  itemType: string;
  expands: number;
  detailViews: number;
  whatsappClicks: number;
  shareClicks: number;
  directions: number;
  saves: number;
  calls: number;
  totalActions: number;
  lastActivity: string | null;
}

type SortKey = keyof ItemRow;

const props = defineProps<{
  eventId: number;
  range: string;
}>();

const loading = ref(false);
const error = ref(false);
const rows = ref<ItemRow[]>([]);
const search = ref('');
const sortKey = ref<SortKey>('totalActions');
const sortDir = ref<'asc' | 'desc'>('desc');

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortKey.value = key;
    sortDir.value = 'desc';
  }
}

function sortIcon(key: SortKey) {
  if (sortKey.value !== key) return 'bi-chevron-expand text-muted opacity-50';
  return sortDir.value === 'desc' ? 'bi-chevron-down' : 'bi-chevron-up';
}

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  return q ? rows.value.filter(r => r.itemName?.toLowerCase().includes(q)) : rows.value;
});

const sorted = computed(() => {
  return [...filtered.value].sort((a, b) => {
    const av = a[sortKey.value];
    const bv = b[sortKey.value];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir.value === 'asc' ? cmp : -cmp;
  });
});

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

async function load() {
  if (!props.eventId) return;
  loading.value = true;
  error.value = false;
  try {
    const { data } = await axios.get<ItemRow[]>(
      `${API_BASE_URL}/analytics/events/${props.eventId}/items`,
      { params: { range: props.range } }
    );
    rows.value = data ?? [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(() => [props.eventId, props.range], load);
onMounted(load);
</script>

<style scoped>
/* ── Toolbar ────────────────────────────────────────────────────────────────── */
.ibt-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}
.ibt-search-wrap {
  position: relative;
  flex: 1;
  min-width: 140px;
}
.ibt-search-icon {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--bs-secondary-color, #6c757d);
  font-size: 0.8rem;
  pointer-events: none;
}
.ibt-search {
  width: 100%;
  padding: 0.35rem 2rem 0.35rem 1.8rem;
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 8px;
  font-size: 0.85rem;
  background: var(--bs-body-bg, #fff);
  color: var(--bs-body-color);
  outline: none;
  transition: border-color 0.15s;
}
.ibt-search:focus { border-color: var(--bs-primary); }
.ibt-search-clear {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  padding: 0;
  font-size: 1rem;
  color: var(--bs-secondary-color, #6c757d);
  cursor: pointer;
  line-height: 1;
}
.ibt-meta { white-space: nowrap; }

/* ── Table ──────────────────────────────────────────────────────────────────── */
.ibt-table-wrap { border-radius: 10px; border: 1px solid var(--bs-border-color, #dee2e6); overflow: hidden; }
.ibt-table th { font-size: 0.72rem; font-weight: 600; padding: 0.5rem 0.5rem; white-space: nowrap; }
.ibt-table td { font-size: 0.82rem; padding: 0.45rem 0.5rem; }
.ibt-table tbody tr:last-child td { border-bottom: none; }

.ibt-sort-btn {
  border: none;
  background: none;
  padding: 0;
  font-size: inherit;
  font-weight: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: inherit;
  white-space: nowrap;
}
.ibt-sort-btn:hover { color: var(--bs-primary); }

/* Column widths */
.ibt-th-name { min-width: 140px; }
.ibt-col-sm { width: 54px; }
.ibt-col-total { width: 60px; }
.ibt-col-date { width: 80px; white-space: nowrap; }

/* Item cell */
.ibt-td-name { max-width: 180px; }
.ibt-item-name {
  font-weight: 500;
  font-size: 0.83rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}
.ibt-type-badge {
  display: inline-block;
  font-size: 0.65rem;
  background: var(--bs-light, #f0f0f0);
  color: var(--bs-secondary-color, #6c757d);
  border-radius: 4px;
  padding: 1px 5px;
  margin-top: 1px;
  text-transform: capitalize;
}

/* Total badge */
.ibt-total-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}
.ibt-total-active { background: var(--bs-primary-bg-subtle, #dde8ff); color: var(--bs-primary); }
.ibt-total-zero { background: var(--bs-light, #f0f0f0); color: var(--bs-secondary-color, #6c757d); }

/* Empty state */
.ibt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  color: var(--bs-secondary-color, #6c757d);
  font-size: 0.88rem;
  text-align: center;
}
.ibt-empty i { font-size: 2rem; opacity: 0.25; }

/* Legend */
.ibt-legend {
  margin-top: 0.5rem;
  font-size: 0.72rem;
  color: var(--bs-secondary-color, #6c757d);
  padding: 0 0.25rem;
}
</style>
