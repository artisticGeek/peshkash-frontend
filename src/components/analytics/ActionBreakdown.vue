<template>
  <div class="action-breakdown">
    <div v-if="!data.length" class="text-muted small py-3 text-center">No actions recorded yet</div>
    <div v-else>
      <div v-for="item in data" :key="item.actionType" class="mb-2">
        <div class="d-flex justify-content-between small mb-1">
          <span class="fw-medium">{{ formatLabel(item.actionType) }}</span>
          <span class="text-muted">{{ item.count }}</span>
        </div>
        <div class="progress" style="height: 6px; border-radius: 3px;">
          <div
            class="progress-bar"
            :style="{ width: pct(item.count) + '%' }"
            :class="barClass(item.actionType)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  data: Array<{ actionType: string; count: number }>;
}>();

const max = computed(() => Math.max(...props.data.map(d => d.count), 1));

function pct(count: number) {
  return Math.round((count / max.value) * 100);
}

const LABEL_MAP: Record<string, string> = {
  whatsapp_click: 'WhatsApp',
  call_click: 'Phone Call',
  email_click: 'Email',
  directions_click: 'Directions',
  share_click: 'Share',
  save_contact: 'Save Contact',
  social_click: 'Social Link',
  item_expand: 'Item Expanded',
  vendor_contact_view: 'Contact Page',
  menu_view: 'Menu View',
  item_detail_view: 'Item Detail',
  landing_page_view: 'Landing Page View',
  landing_whatsapp_hero: 'Hero WhatsApp',
  landing_demo_anchor: 'See It in Action',
  landing_whatsapp_business: 'Business WhatsApp',
  landing_whatsapp_faq: 'FAQ WhatsApp',
  landing_whatsapp_contact: 'Contact WhatsApp',
  landing_get_started: 'Get Started',
  landing_whatsapp_nav: 'Navigation WhatsApp',
  landing_call: 'Landing Phone Call',
  landing_email: 'Landing Email',
  landing_contact_form_submit: 'Contact Form Submitted',
  landing_whatsapp_footer: 'Footer WhatsApp',
  landing_instagram_footer: 'Footer Instagram',
  landing_email_footer: 'Footer Email',
  landing_whatsapp_floating: 'Floating WhatsApp',
};

function formatLabel(type: string) {
  return LABEL_MAP[type] ?? type.replace(/_/g, ' ');
}

const COLOR_MAP: Record<string, string> = {
  whatsapp_click: 'bg-success',
  call_click: 'bg-primary',
  email_click: 'bg-info',
  directions_click: 'bg-warning',
  share_click: 'bg-secondary',
  save_contact: 'bg-dark',
  item_expand: 'bg-primary',
};

function barClass(type: string) {
  return COLOR_MAP[type] ?? 'bg-primary';
}
</script>
