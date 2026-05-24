<template>
  <div class="qr-target-preview">
    <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR preview" />
    <div class="qr-copy">
      <strong>{{ label }}</strong>
      <span>{{ type }}</span>
      <code>{{ path }}</code>
    </div>
    <a class="btn btn-outline-secondary btn-sm" :href="absoluteUrl" target="_blank" rel="noreferrer">Open</a>
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode';
import { computed, ref, watchEffect } from 'vue';

const props = defineProps<{
  label: string;
  type: string;
  path: string;
}>();

const qrDataUrl = ref('');
const absoluteUrl = computed(() => `${window.location.origin}${props.path.startsWith('/') ? props.path : `/${props.path}`}`);

watchEffect(async () => {
  qrDataUrl.value = props.path
    ? await QRCode.toDataURL(absoluteUrl.value, { margin: 1, width: 96 })
    : '';
});
</script>

<style scoped>
.qr-target-preview {
  align-items: center;
  border-bottom: 1px solid #eee6db;
  display: grid;
  gap: 12px;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  padding: 10px 0;
}

.qr-target-preview img {
  background: #fff;
  border: 1px solid #e8ddcf;
  border-radius: 6px;
  height: 72px;
  padding: 4px;
  width: 72px;
}

.qr-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.qr-copy strong {
  color: #15191e;
}

.qr-copy span {
  color: #7a542a;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.qr-copy code {
  color: #853f19;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .qr-target-preview {
    grid-template-columns: 72px 1fr;
  }

  .qr-target-preview a {
    grid-column: 1 / -1;
  }
}
</style>
