<template>
  <Navbar></Navbar>



  <div class="container-fluid text-center">

    

    <div v-if="isLoading">
      <div class="spinner-grow text-primary justify-content-center shadow-lg" style="margin-top:15%; width: 3rem; height: 3rem;" role="status">
  <span class="visually-hidden">Loading...</span>
</div>
<br>
<div class="spinner-grow text-info justify-content-center shadow-lg" style="margin-top:15%; width: 2rem; height: 2rem;" role="status">
  <span class="visually-hidden">Loading...</span>

  
</div>
<br>
<div class="spinner-grow text-white justify-content-center shadow-lg" style="margin-top:15%; width: 1rem; height: 1rem;" role="status">
  <span class="visually-hidden">Loading...</span>

  
</div>
<br>
<div class="spinner-grow text-primary justify-content-center shadow-lg" style="margin-top:15%; width: 3rem; height: 3rem;" role="status">
  <span class="visually-hidden">Loading...</span>
</div>
    </div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else>
      <div class="row alert bg-white text-primary shadow-sm justify-content-center">
         {{itemData.event.vendor.displayName}} 
        @ {{itemData.event.displayName}}
      </div>
      <nav aria-label="breadcrumb">
  <ul class="breadcrumb">
    
    <li v-for="parentItem in itemData.parentItems" class="breadcrumb-item">{{ parentItem.displayName }}</li>
  </ul>
</nav>
      <hr>
      <h1 class="text-secondary">{{ itemData?.name }}</h1>
        
        <img v-bind:src="itemData?.image" style="max-width:100%" alt="dish"> 
        <hr width="50%" class="mx-auto text-primary mt-0">
    

    <h3 class="text-primary text-center"><i class="bi bi-fork-knife"></i> About the delight!</h3>
  <h6>
  {{itemData?.description}}
  </h6>
  <br>
  <h6 class="text-info"><i class="bi bi-info-circle-fill"></i> Ingredients: </h6>
  <h6>
  <em>{{itemData?.ingredients}}</em>
  </h6>
</div>
  </div>
  
  
  

</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue';

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
