<template>
  <div class="p-4 text-lg">
    <div v-if="isLoading">Loading item...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else>
      <h2 class="text-2xl font-bold mb-2">{{ itemData?.name }}</h2>
      <p><strong>Menu:</strong> {{ menuName }}</p>
      <p><strong>Event:</strong> {{ eventName }}</p>
      <p><strong>Description:</strong> {{ itemData?.description || 'No description' }}</p>
      <p><strong>Items: </strong>{{ itemData.menu.lineItems }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const eventName = route.params.eventName as string
const menuName = route.params.menuName as string
const itemName = route.params.itemName as string

const itemData = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const res = await fetch(`https://peshkash-backend.onrender.com/api/event/${eventName}/menu/${menuName}/item/${itemName}`)
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
