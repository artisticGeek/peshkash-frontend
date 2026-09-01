<template>
  <section class="social-preview-editor">
    <div class="social-preview-heading">
      <div>
        <p class="eyebrow">Social preview</p>
        <h5>Shared event card</h5>
        <p class="hint">Use a 1200 × 630 image. Without one, Peshkash uses the event hero and then the brand fallback.</p>
      </div>
      <span class="source-badge">{{ sourceLabel }}</span>
    </div>

    <div class="social-preview-layout">
      <div class="social-preview-fields">
        <label>Preview image URL<input v-model.trim="model.imageUrl" type="url" class="form-control" placeholder="https://…/preview.jpg" /></label>
        <div class="upload-row">
          <label class="btn btn-outline-secondary btn-sm upload-button">
            <i class="bi bi-upload"></i>{{ uploading ? 'Uploading…' : 'Upload image' }}
            <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="uploading || !vendorName" @change="uploadImage" />
          </label>
          <small>JPEG, PNG or WebP · maximum 1 MB</small>
        </div>
        <label>Image alt text<input v-model.trim="model.imageAlt" class="form-control" maxlength="220" placeholder="Describe the event image" /></label>
        <label>Preview title <small>{{ model.titleOverride.length }}/90</small><input v-model.trim="model.titleOverride" class="form-control" maxlength="90" :placeholder="eventTitle" /></label>
        <label>Preview description <small>{{ model.descriptionOverride.length }}/220</small><textarea v-model.trim="model.descriptionOverride" class="form-control" rows="3" maxlength="220" :placeholder="eventDescription || 'Event date, venue and details'" /></label>
        <div class="preview-actions">
          <button type="button" class="btn btn-outline-primary btn-sm" @click="refreshPreview"><i class="bi bi-arrow-repeat"></i> Refresh social preview</button>
          <button type="button" class="btn btn-link btn-sm" @click="resetAutomatic">Reset image to automatic</button>
          <a v-if="eventName" :href="sharePreviewUrl" target="_blank" rel="noreferrer">Open crawler preview <i class="bi bi-box-arrow-up-right"></i></a>
        </div>
        <p class="version-line">Active version: v{{ model.version }}<span v-if="model.generatedAt"> · refreshed {{ formattedGeneratedAt }}</span></p>
        <ul v-if="warnings.length" class="preview-warnings" aria-live="polite">
          <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
        </ul>
      </div>

      <div class="social-card" aria-label="Social preview card">
        <img :key="previewImage" :src="previewImage" :alt="model.imageAlt || eventTitle" @load="inspectImage" @error="imageError = true" />
        <div>
          <strong>{{ model.titleOverride || eventTitle || 'Event title' }}</strong>
          <span>{{ model.descriptionOverride || eventDescription || 'Event details on Peshkash' }}</span>
          <small>peshkash.app</small>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, ref, watch } from 'vue';
import { API_BASE_URL } from '../../config';

export type SocialPreviewConfig = {
  imageUrl: string;
  imageAlt: string;
  titleOverride: string;
  descriptionOverride: string;
  version: number;
  generatedImageUrl: string;
  generatedAt: string;
  source?: 'custom' | 'generated' | 'hero' | 'fallback';
};

const props = defineProps<{
  eventName: string;
  eventTitle: string;
  eventDescription?: string;
  heroImageUrl?: string;
  vendorName?: string;
}>();
const model = defineModel<SocialPreviewConfig>({ required: true });
const emit = defineEmits<{ validation: [valid: boolean] }>();
const uploading = ref(false);
const imageError = ref(false);
const dimensions = ref<{ width: number; height: number } | null>(null);
const uploadError = ref('');

const fallbackImage = '/brand/social/peshkash-home-preview.jpg';
const previewImage = computed(() => model.value.imageUrl || model.value.generatedImageUrl || props.heroImageUrl || fallbackImage);
const sourceLabel = computed(() => model.value.imageUrl ? 'Custom image' : model.value.generatedImageUrl ? 'Generated image' : props.heroImageUrl ? 'Event hero' : 'Peshkash fallback');
const sharePreviewUrl = computed(() => `${API_BASE_URL}/share/event/${encodeURIComponent(props.eventName)}`);
const formattedGeneratedAt = computed(() => {
  const date = new Date(model.value.generatedAt);
  return Number.isNaN(date.getTime()) ? model.value.generatedAt : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
});
const warnings = computed(() => {
  const result: string[] = [];
  if (uploadError.value) result.push(uploadError.value);
  if (model.value.imageUrl && !model.value.imageAlt.trim()) result.push('Add meaningful alt text before publishing this custom image.');
  if (model.value.imageUrl && !/^https:\/\//i.test(model.value.imageUrl)) result.push('Production preview images must use HTTPS.');
  if (imageError.value) result.push('The resolved preview image could not be reached.');
  if (dimensions.value) {
    if (dimensions.value.width < 600 || dimensions.value.height < 315) result.push(`Image is only ${dimensions.value.width} × ${dimensions.value.height}; minimum is 600 × 315.`);
    const ratio = dimensions.value.width / dimensions.value.height;
    if (Math.abs(ratio - (1200 / 630)) > 0.04) result.push(`Image ratio is ${ratio.toFixed(2)}:1; use 1.91:1 to avoid cropping.`);
  }
  return result;
});

watch(previewImage, () => { dimensions.value = null; imageError.value = false; uploadError.value = ''; });
watch(warnings, (value) => emit('validation', value.length === 0), { immediate: true });

function inspectImage(event: Event) {
  const image = event.currentTarget as HTMLImageElement;
  dimensions.value = { width: image.naturalWidth, height: image.naturalHeight };
  imageError.value = false;
}

async function fileDimensions(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadImage(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !props.vendorName) return;
  uploadError.value = '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { uploadError.value = 'Choose a JPEG, PNG or WebP image.'; return; }
  if (file.size > 1024 * 1024) { uploadError.value = 'The image exceeds the 1 MB publishing limit.'; return; }
  const size = await fileDimensions(file);
  if (size.width < 600 || size.height < 315) { uploadError.value = `Image is only ${size.width} × ${size.height}; minimum is 600 × 315.`; return; }
  if (Math.abs((size.width / size.height) - (1200 / 630)) > 0.04) { uploadError.value = 'Use a 1.91:1 image (ideally 1200 × 630) to avoid social-platform cropping.'; return; }

  uploading.value = true;
  try {
    const form = new FormData();
    form.append('image', file);
    const response = await axios.post<{ url: string } | string>(`${API_BASE_URL}/onboard/${encodeURIComponent(props.vendorName)}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    model.value.imageUrl = typeof response.data === 'string' ? response.data : response.data.url;
    model.value.imageAlt ||= `${props.eventTitle} event preview`;
    dimensions.value = size;
    refreshPreview();
  } catch (error: any) {
    uploadError.value = error?.response?.data?.message || 'The preview image could not be uploaded.';
  } finally {
    uploading.value = false;
  }
}

function refreshPreview() {
  model.value.version = Math.max(1, Number(model.value.version) || 1) + 1;
  model.value.generatedAt = new Date().toISOString();
  model.value.source = model.value.imageUrl ? 'custom' : model.value.generatedImageUrl ? 'generated' : props.heroImageUrl ? 'hero' : 'fallback';
}

function resetAutomatic() {
  model.value.imageUrl = '';
  model.value.generatedImageUrl = '';
  model.value.source = props.heroImageUrl ? 'hero' : 'fallback';
  refreshPreview();
}
</script>

<style scoped>
.social-preview-editor{border-top:1px solid #dfd2c4;margin-top:1.5rem;padding-top:1.5rem}.social-preview-heading{align-items:flex-start;display:flex;gap:1rem;justify-content:space-between}.social-preview-heading h5{margin:.15rem 0}.source-badge{background:#f4e9da;border:1px solid #dbc6ad;border-radius:999px;color:#6f4e27;font-size:.72rem;font-weight:700;padding:.4rem .65rem;white-space:nowrap}.social-preview-layout{display:grid;gap:1.5rem;grid-template-columns:minmax(0,1fr) minmax(280px,.8fr);margin-top:1rem}.social-preview-fields{display:grid;gap:.8rem}.social-preview-fields label{display:grid;gap:.35rem}.social-preview-fields label small{color:#877465;float:right}.upload-row,.preview-actions{align-items:center;display:flex;flex-wrap:wrap;gap:.65rem}.upload-row small,.version-line{color:#806f61;font-size:.78rem}.upload-button{display:inline-flex!important;flex-direction:row!important;gap:.4rem;width:max-content!important}.upload-button input{display:none}.preview-actions a{font-size:.82rem;margin-left:auto}.social-card{align-self:start;background:#17120f;border-radius:10px;box-shadow:0 12px 35px #2f241a26;overflow:hidden}.social-card img{aspect-ratio:1.91/1;display:block;object-fit:cover;width:100%}.social-card>div{display:grid;gap:.35rem;padding:1rem}.social-card strong{color:#fff;font-family:Georgia,serif;font-size:1.25rem}.social-card span{color:#d6c8ba;font-size:.82rem}.social-card small{color:#b8915d;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase}.preview-warnings{background:#fff5e5;border:1px solid #e8c887;color:#7b5120;font-size:.8rem;margin:0;padding:.7rem .8rem .7rem 1.8rem}@media(max-width:800px){.social-preview-layout{grid-template-columns:1fr}.preview-actions a{margin-left:0}}
</style>
