<template>
  <div class="ms-cta-editor">
    <div class="ms-cta-row" role="group" aria-label="Built-in buttons">
      <button
        v-for="cta in BUILT_IN_CTAS"
        :key="cta.key"
        type="button"
        class="ms-cta-chip"
        :class="{ on: modelValue[cta.key] }"
        :aria-pressed="modelValue[cta.key]"
        @click="emitChange({ ...modelValue, [cta.key]: !modelValue[cta.key] })"
      >
        <i :class="['bi', cta.icon]"></i>{{ cta.label }}
      </button>
    </div>

    <div v-for="(cta, index) in modelValue.custom" :key="cta.id" class="ms-cta-custom">
      <div class="ms-cta-custom-head">
        <i :class="['bi', customCtaIcon(cta.kind)]"></i>
        <input :id="`${idPrefix}-label-${index}`" :value="cta.label" maxlength="32" aria-label="Button label" @input="patchCustom(index, { label: value($event) })" />
        <button type="button" class="ms-icon-btn danger" title="Remove button" @click="removeCustom(index)"><i class="bi bi-x-lg"></i></button>
      </div>
      <label :for="`${idPrefix}-value-${index}`">{{ cta.kind === 'link' ? 'Opens' : 'Phone number' }}</label>
      <input
        :id="`${idPrefix}-value-${index}`"
        :value="cta.value"
        :placeholder="placeholder(cta.kind)"
        :inputmode="cta.kind === 'link' ? 'url' : 'tel'"
        @input="patchCustom(index, { value: value($event) })"
      />
      <template v-if="cta.kind === 'whatsapp'">
        <label :for="`${idPrefix}-msg-${index}`">Pre-filled message <small>({item} becomes the item name)</small></label>
        <input :id="`${idPrefix}-msg-${index}`" :value="cta.message" maxlength="300" @input="patchCustom(index, { message: value($event) })" />
      </template>
      <small v-if="!customCtaHref(cta, 'item')" class="ms-warn">Guests won't see this button until the {{ cta.kind === 'link' ? 'link starts with https://' : 'phone number is complete' }}.</small>
    </div>

    <div v-if="modelValue.custom.length < MAX_CUSTOM_CTAS" class="ms-cta-add">
      <span>Add a button:</span>
      <button v-for="kind in CUSTOM_CTA_KINDS" :key="kind.kind" type="button" class="ms-btn sm" @click="addCustom(kind.kind)">
        <i :class="['bi', kind.icon]"></i> {{ kind.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BUILT_IN_CTAS, CUSTOM_CTA_KINDS, MAX_CUSTOM_CTAS, customCtaHref, customCtaIcon, newCustomCta } from '../cta';
import type { CtaConfig, CustomCta, CustomCtaKind } from '../types';

const props = defineProps<{ modelValue: CtaConfig; idPrefix: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: CtaConfig] }>();

function emitChange(next: CtaConfig) {
  emit('update:modelValue', next);
}

const value = (event: Event) => (event.target as HTMLInputElement).value;
const placeholder = (kind: CustomCtaKind) => CUSTOM_CTA_KINDS.find((entry) => entry.kind === kind)?.placeholder ?? '';

function patchCustom(index: number, patch: Partial<CustomCta>) {
  const custom = props.modelValue.custom.map((cta, i) => (i === index ? { ...cta, ...patch } : cta));
  emitChange({ ...props.modelValue, custom });
}

function removeCustom(index: number) {
  emitChange({ ...props.modelValue, custom: props.modelValue.custom.filter((_, i) => i !== index) });
}

function addCustom(kind: CustomCtaKind) {
  emitChange({ ...props.modelValue, custom: [...props.modelValue.custom, newCustomCta(kind, props.modelValue.custom)] });
}
</script>
