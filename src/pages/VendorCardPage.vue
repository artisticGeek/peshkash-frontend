<template>
  <Navbar />
  
  <!-- Loading State -->
  <div v-if="isLoading" class="container py-5">
    <div class="text-center">
      <div class="spinner-grow text-primary shadow-lg" style="width: 3rem; height: 3rem;" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="container py-5">
    <div class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      {{ error }}
    </div>
  </div>

  <!-- Vendor Card Content - Set 1 Design -->
  <div v-else class="vendor-card-page">
    <!-- Top Section: Cream Background -->
    <div class="top-section">
      <div class="container">
        <!-- Vendor Name & Tagline -->
        <h1 class="vendor-name text-center">{{ vendorData?.displayName }}</h1>
        <p v-if="vendorData?.description" class="vendor-tagline text-center">
          {{ vendorData.description }}
        </p>
      </div>
    </div>

    <!-- Bottom Section: Gold Background -->
    <div class="bottom-section">
      <div class="container">
        <!-- White Contact Card (overlaps both sections) -->
        <div class="contact-card mx-auto">
          <!-- Logo Circle on top of card -->
          <div class="logo-circle mx-auto">
            <i class="bi bi-briefcase-fill"></i>
          </div>

          <!-- Contact Information -->
          <div class="contact-section">
            <h2 class="section-heading">Get in Touch</h2>
            
            <div class="contact-info">
              <!-- Phone Numbers -->
              <div v-if="vendorData?.contact && vendorData.contact.length > 0" class="info-group">
                <div 
                  v-for="(phone, index) in vendorData.contact" 
                  :key="index"
                  class="info-item"
                >
                  <i class="bi bi-telephone-fill info-icon"></i>
                  <a :href="`tel:${phone}`" class="info-link">{{ phone }}</a>
                </div>
              </div>

              <!-- Address -->
              <div v-if="vendorData?.address" class="info-group">
                <div class="info-item">
                  <i class="bi bi-geo-alt-fill info-icon"></i>
                  <span class="info-text">{{ vendorData.address }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="card-divider"></div>

          <!-- Circular Action Buttons Inside Card -->
          <div class="card-actions">
            <button 
              class="btn btn-outline-primary rounded-circle"
              @click="downloadVCard"
              aria-label="Save Contact"
            >
              <i class="bi bi-bookmark-fill fs-5"></i>
            </button>
            <button 
              class="btn btn-primary rounded-circle"
              @click="shareCard"
              aria-label="Share"
            >
              <i class="bi bi-share-fill fs-5"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import { API_BASE_URL } from '../config'

const route = useRoute()
const vendorName = route.params.vendorName as string

const vendorData = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

const downloadVCard = () => {
  if (!vendorData.value) return

  // Generate vCard format
  const vCard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${vendorData.value.displayName}`,
    `ORG:${vendorData.value.displayName}`,
    vendorData.value.contact?.map((phone: string) => `TEL:${phone}`).join('\n') || '',
    vendorData.value.address ? `ADR:;;${vendorData.value.address};;;;` : '',
    vendorData.value.description ? `NOTE:${vendorData.value.description}` : '',
    'END:VCARD'
  ].filter(Boolean).join('\n')

  // Create download
  const blob = new Blob([vCard], { type: 'text/vcard' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${vendorData.value.name}.vcf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

const shareCard = async () => {
  if (!vendorData.value) return

  const shareData = {
    title: vendorData.value.displayName,
    text: vendorData.value.description || `Contact information for ${vendorData.value.displayName}`,
    url: window.location.href
  }

  if (navigator.share) {
    try {
      await navigator.share(shareData)
    } catch (err) {
      console.error('Error sharing:', err)
    }
  } else {
    // Fallback: copy URL to clipboard
    navigator.clipboard.writeText(window.location.href)
    alert('Link copied to clipboard!')
  }
}

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/vendor/${vendorName}`)
    
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Vendor not found')
      } else if (res.status === 403) {
        throw new Error('This vendor card is not available')
      }
      throw new Error(`Failed to load vendor card: ${res.status}`)
    }
    
    const data = await res.json()
    vendorData.value = data
  } catch (err: any) {
    error.value = err.message || 'An error occurred while loading the vendor card'
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
/* Page Layout - 2-Tone Background */
.vendor-card-page {
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

/* Top Section - Cream Background with subtle gradient */
.top-section {
  background: linear-gradient(180deg, #F5F2EE 0%, #EBE7E1 100%);
  padding: 3rem 1rem 5.5rem;
  flex-shrink: 0;
}

/* Bottom Section - Gold/Tan Background */
.bottom-section {
  background: linear-gradient(135deg, #D6C6AA 0%, #CBB897 100%);
  flex: 1;
  padding: 0 1rem 3.5rem;
  display: flex;
  align-items: flex-start;
}

/* Vendor Name & Tagline - Above card */
.vendor-name {
  font-family: 'Rufina', serif;
  font-size: 2rem;
  font-weight: 700;
  color: #1a1410;
  margin-bottom: 0.5rem;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.vendor-tagline {
  font-size: 0.95rem;
  color: #6c6560;
  margin-bottom: 0;
  line-height: 1.5;
  margin-left: auto;
  margin-right: auto;
  font-weight: 400;
  padding: 0 1.5rem;
}

/* White Contact Card - Overlaps both sections */
.contact-card {
  max-width: 340px;
  width: 100%;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.13);
  padding: 0;
  margin-top: -2rem;
  position: relative;
}

/* Logo Circle - On top of card */
.logo-circle {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 2.5px solid #BD945A;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: -34px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 4px 14px rgba(189, 148, 90, 0.22);
}

.logo-circle i {
  font-size: 2.1rem;
  color: #BD945A;
}

/* Contact Section */
.contact-section {
  padding: 4.25rem 2rem 1.75rem;
}

.section-heading {
  font-family: 'Rufina', serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: #2c2416;
  text-align: center;
  margin-bottom: 1.5rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-size: 0.85rem;
}

/* Contact Information */
.contact-info {
  margin-bottom: 0;
}

.info-group {
  margin-bottom: 1.1rem;
}

.info-group:last-child {
  margin-bottom: 0;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  padding: 0.35rem 0;
}

.info-icon {
  font-size: 1.05rem;
  color: #BD945A;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  margin-top: 0.15rem;
}

.info-link {
  color: #1a1410;
  text-decoration: none;
  font-size: 0.96rem;
  transition: all 0.2s ease;
  font-weight: 500;
  flex: 1;
  line-height: 1.5;
}

.info-link:hover {
  color: #BD945A;
  text-decoration: underline;
}

.info-text {
  color: #1a1410;
  font-size: 0.96rem;
  line-height: 1.55;
  flex: 1;
}

/* Decorative Divider */
.card-divider {
  height: 1.5px;
  background: linear-gradient(
    to right,
    transparent 8%,
    #BD945A 50%,
    transparent 92%
  );
  margin: 1.6rem 1.85rem;
  opacity: 0.35;
  position: relative;
}

.card-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 5px;
  height: 5px;
  background: #BD945A;
  border-radius: 50%;
}

/* Circular Action Buttons Inside Card */
.card-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  padding: 0 2rem 2rem;
}

.card-actions .btn {
  width: 54px;
  height: 54px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  transition: all 0.2s ease;
}

.card-actions .btn-outline-primary {
  border-color: var(--rx-main-color, #BD945A);
  border-width: 2px;
  color: var(--rx-main-color, #BD945A);
  background: white;
}

.card-actions .btn-outline-primary:hover {
  background-color: var(--rx-main-color, #BD945A);
  border-color: var(--rx-main-color, #BD945A);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(189, 148, 90, 0.25);
}

.card-actions .btn-primary {
  background-color: var(--rx-main-color, #BD945A);
  border-color: var(--rx-main-color, #BD945A);
  color: white;
}

.card-actions .btn-primary:hover {
  background-color: #a37d45;
  border-color: #a37d45;
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(189, 148, 90, 0.35);
}

/* Mobile Responsiveness */
@media (max-width: 576px) {
  .top-section {
    padding: 2.25rem 1rem 4rem;
  }
  
  .bottom-section {
    padding: 0 1rem 2.75rem;
  }
  
  .vendor-name {
    font-size: 1.65rem;
  }
  
  .vendor-tagline {
    font-size: 0.9rem;
  }
  
  .contact-card {
    max-width: 100%;
  }
  
  .contact-section {
    padding: 3rem 1.35rem 1.35rem;
  }
  
  .card-divider {
    margin: 1.4rem 1.35rem 1.6rem;
  }
}
</style>
