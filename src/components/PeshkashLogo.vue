<template>
  <img
    :src="src"
    :alt="alt"
    :height="height"
    :width="computedWidth"
    class="pk-logo"
    :class="{ 'pk-logo--symbol': symbol }"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

import primaryDark from '@/assets/logo/Peshkash-Primary-For-Dark-Display.svg'
import primaryLight from '@/assets/logo/Peshkash-Primary-For-Light-Display.svg'
import symbolDark from '@/assets/logo/Peshkash-Symbol-For-Dark.svg'
import symbolLight from '@/assets/logo/Peshkash-Symbol-For-Light.svg'

const props = withDefaults(defineProps<{
  variant?: 'dark-bg' | 'light-bg'
  symbol?: boolean
  height?: number
  alt?: string
}>(), {
  variant: 'dark-bg',
  symbol: false,
  height: 28,
  alt: 'Peshkash',
})

const src = computed(() => {
  if (props.symbol) {
    return props.variant === 'light-bg' ? symbolLight : symbolDark
  }
  return props.variant === 'light-bg' ? primaryLight : primaryDark
})

// Primary lockup is 3:1, symbol is 1:1
const computedWidth = computed(() => {
  if (props.symbol) return props.height
  return Math.round(props.height * 3)
})
</script>

<style scoped>
.pk-logo {
  display: block;
  flex-shrink: 0;
  object-fit: contain;
}
</style>
