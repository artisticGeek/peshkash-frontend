<template>
<div style="padding: 2rem;">Full Menu Page (Coming Soon)</div>
{{ itemData }}
</template>


<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const eventName = route.params.eventName as string
const menuName = route.params.menuName as string

const itemData = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const res = await fetch(`https://peshkash-backend.onrender.com/api/event/${eventName}/menu/${menuName}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()
    itemData.value = data
    console.log(itemData.value)
  } catch (err: any) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
})
</script>