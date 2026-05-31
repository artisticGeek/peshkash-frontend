<template>
  <Navbar />

  <div v-if="isLoading" class="container py-5">
    <div class="text-center">
      <div class="spinner-grow shadow-lg" style="width: 3rem; height: 3rem; color: #BD945A;" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  </div>

  <div v-else-if="error" class="container py-5">
    <div class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error }}
    </div>
  </div>

  <div v-else class="vendor-card-page">

    <div class="top-section">
      <h1 class="vendor-name text-center">{{ vendorData?.displayName }}</h1>
      <p v-if="vendorData?.description" class="vendor-tagline text-center">{{ vendorData.description }}</p>
    </div>

    <div class="bottom-section">
      <div class="container">
        <div class="contact-card mx-auto">

          <!-- Logo -->
          <div class="logo-circle mx-auto">
            <img v-if="vendorData?.logoUrl" :src="vendorData.logoUrl" :alt="vendorData.displayName" class="logo-img" />
            <i v-else class="bi bi-briefcase-fill"></i>
          </div>

          <!-- Contact list -->
          <div class="contact-section">
            <h2 class="section-heading">Get in Touch</h2>

            <div class="contact-list">

              <!-- Phone -->
              <div v-if="phoneField" class="contact-row">
                <i class="bi bi-telephone-fill row-icon"></i>
                <a :href="'tel:' + phoneField.value" class="row-value">{{ phoneField.value }}</a>
                <button
                  class="copy-btn"
                  :class="{ copied: copiedKey === 'phone' }"
                  type="button"
                  :title="copiedKey === 'phone' ? 'Copied!' : 'Copy number'"
                  @click="copy(phoneField.value, 'phone')"
                >
                  <i :class="copiedKey === 'phone' ? 'bi bi-check2' : 'bi bi-copy'"></i>
                </button>
              </div>

              <!-- Email -->
              <div v-if="emailField" class="contact-row">
                <i class="bi bi-envelope-fill row-icon"></i>
                <a :href="'mailto:' + emailField.value" class="row-value">{{ emailField.value }}</a>
                <button
                  class="copy-btn"
                  :class="{ copied: copiedKey === 'email' }"
                  type="button"
                  :title="copiedKey === 'email' ? 'Copied!' : 'Copy email'"
                  @click="copy(emailField.value, 'email')"
                >
                  <i :class="copiedKey === 'email' ? 'bi bi-check2' : 'bi bi-copy'"></i>
                </button>
              </div>

              <!-- Website -->
              <div v-if="websiteField" class="contact-row">
                <i class="bi bi-globe row-icon"></i>
                <a :href="websiteHref" class="row-value" target="_blank" rel="noreferrer">{{ websiteDomain }}</a>
              </div>

              <!-- Business Hours — structured display -->
              <div v-if="businessDays || businessHours" class="contact-row hours-row">
                <i class="bi bi-clock row-icon"></i>
                <div class="hours-block">
                  <span v-if="businessDays" class="hours-days">{{ businessDays }}</span>
                  <span v-if="businessDays && businessHours" class="hours-sep">·</span>
                  <span v-if="businessHours" class="hours-time">{{ businessHours }}</span>
                </div>
              </div>

            </div>
          </div>

          <!-- Map — themed, read-only -->
          <div v-if="mapQuery" class="map-section">
            <div class="map-frame-wrap">
              <iframe
                :src="`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed&z=15`"
                class="map-embed"
                loading="lazy"
                frameborder="0"
                scrolling="no"
              ></iframe>
              <!-- Overlay blocks all pointer interaction with the iframe -->
              <div class="map-overlay" aria-hidden="true"></div>
            </div>
          </div>

          <!-- Quick Links — WhatsApp, socials, Directions -->
          <div v-if="socialActions.length" class="quick-links-section">
            <p class="quick-links-heading">Quick Links</p>
            <div class="social-row">
              <a
                v-for="action in socialActions"
                :key="action.key"
                :href="action.href"
                class="social-btn"
                :title="action.label"
                target="_blank"
                rel="noreferrer"
              >
                <i :class="'bi ' + action.icon"></i>
                <span>{{ action.label }}</span>
              </a>
            </div>
          </div>

          <!-- Divider -->
          <div class="card-divider"></div>

          <!-- Primary CTAs — pill shaped, visually distinct from social circles -->
          <div class="card-actions">
            <button class="cta-btn cta-outline" type="button" @click="downloadVCard">
              <i class="bi bi-person-plus-fill"></i>
              Save Contact
            </button>
            <button class="cta-btn cta-filled" type="button" @click="shareCard">
              <i class="bi bi-share-fill"></i>
              Share
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>

  <!-- Login gate — Teleports to <body>, so placement here doesn't affect layout.
       noDismiss: no close button, backdrop click shakes the card.
       Page content blurs behind the backdrop. No redirect on any outcome. -->
  <LoginModal
    v-model="loginModalOpen"
    no-dismiss
    @success="onLoginSuccess"
  />
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import LoginModal from '../components/auth/LoginModal.vue'
import { API_BASE_URL } from '../config'
import { useAnalytics } from '../composables/useAnalytics'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const vendorName = route.params.vendorName as string

// Auth & login gate
const authStore = useAuthStore()
const loginModalOpen = ref(false)

// Computed: true once logged in — authStore.login() is called by useOtpLogin internally
const isLoggedIn = computed(() => authStore.isLoggedIn)

// Called after successful OTP verification; auth store is already updated by then.
// Modal closes itself — nothing extra needed here.
function onLoginSuccess() {
  loginModalOpen.value = false
}

// Analytics — context is filled after data loads
const analytics = useAnalytics()

const vendorData = ref<any>(null)
const isLoading  = ref(true)
const error      = ref<string | null>(null)
const copiedKey  = ref<string | null>(null)

// ── Copy helper ───────────────────────────────────────────────────────────────
async function copy(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => { if (copiedKey.value === key) copiedKey.value = null }, 2000)
  } catch { /* ignore */ }
}

// ── Contact field registry ────────────────────────────────────────────────────
type ContactMeta = {
  icon: string
  hrefFn?: (v: string) => string
  isSocial?: boolean
  socialIcon?: string
  socialLabel?: string
  socialKey?: string
}

const CONTACT_FIELD_MAP: Record<string, ContactMeta> = {
  'Phone':          { icon: 'bi bi-telephone-fill',  hrefFn: (v) => `tel:${v}` },
  'Email':          { icon: 'bi bi-envelope-fill',   hrefFn: (v) => `mailto:${v}` },
  'Website':        { icon: 'bi bi-globe',            hrefFn: (v) => v.startsWith('http') ? v : `https://${v}` },
  'Google Maps':    { icon: 'bi bi-geo-alt-fill',     hrefFn: (v) => v.startsWith('http') ? v : `https://maps.google.com/?q=${encodeURIComponent(v)}` },
  'Business Days':  { icon: 'bi bi-calendar3' },
  'Business Hours': { icon: 'bi bi-clock' },
  'WhatsApp': {
    icon: 'bi bi-whatsapp',
    hrefFn: (v) => `https://wa.me/${v.replace(/[\s\-+().]/g, '')}`,
    isSocial: true, socialIcon: 'bi-whatsapp', socialLabel: 'WhatsApp', socialKey: 'whatsapp',
  },
  'Instagram': {
    icon: 'bi bi-instagram',
    hrefFn: (v) => v.startsWith('http') ? v : `https://instagram.com/${v.replace(/^@/, '')}`,
    isSocial: true, socialIcon: 'bi-instagram', socialLabel: 'Instagram', socialKey: 'instagram',
  },
  'Facebook': {
    icon: 'bi bi-facebook',
    hrefFn: (v) => v.startsWith('http') ? v : `https://facebook.com/${v}`,
    isSocial: true, socialIcon: 'bi-facebook', socialLabel: 'Facebook', socialKey: 'facebook',
  },
  'LinkedIn': {
    icon: 'bi bi-linkedin',
    hrefFn: (v) => v.startsWith('http') ? v : `https://linkedin.com/in/${v}`,
    isSocial: true, socialIcon: 'bi-linkedin', socialLabel: 'LinkedIn', socialKey: 'linkedin',
  },
  'Twitter': {
    icon: 'bi bi-twitter-x',
    hrefFn: (v) => v.startsWith('http') ? v : `https://x.com/${v.replace(/^@/, '')}`,
    isSocial: true, socialIcon: 'bi-twitter-x', socialLabel: 'X / Twitter', socialKey: 'twitter',
  },
  'YouTube': {
    icon: 'bi bi-youtube',
    hrefFn: (v) => v.startsWith('http') ? v : `https://youtube.com/@${v.replace(/^@/, '')}`,
    isSocial: true, socialIcon: 'bi-youtube', socialLabel: 'YouTube', socialKey: 'youtube',
  },
}

// ── Raw parsed contact list (used for vCard + field lookups) ──────────────────
const parsedContact = computed(() => {
  if (!vendorData.value?.contact) return []
  return (vendorData.value.contact as string[]).map((raw) => {
    const colonIdx = raw.indexOf(':')
    if (colonIdx > 0) {
      const prefix = raw.slice(0, colonIdx).trim()
      const value  = raw.slice(colonIdx + 1).trim()
      const meta   = CONTACT_FIELD_MAP[prefix]
      if (meta) return { prefix, value, icon: meta.icon, href: meta.hrefFn?.(value), isSocial: !!meta.isSocial }
    }
    return { prefix: 'Phone', value: raw, icon: 'bi bi-telephone-fill', href: `tel:${raw}`, isSocial: false }
  })
})

// ── Per-field accessors ───────────────────────────────────────────────────────
const phoneField    = computed(() => parsedContact.value.find(f => f.prefix === 'Phone'))
const emailField    = computed(() => parsedContact.value.find(f => f.prefix === 'Email'))
const websiteField  = computed(() => parsedContact.value.find(f => f.prefix === 'Website'))
const businessDays  = computed(() => parsedContact.value.find(f => f.prefix === 'Business Days')?.value  ?? '')
const businessHours = computed(() => parsedContact.value.find(f => f.prefix === 'Business Hours')?.value ?? '')

const websiteHref = computed(() => {
  const v = websiteField.value?.value ?? ''
  return v.startsWith('http') ? v : `https://${v}`
})
const websiteDomain = computed(() => {
  try { return new URL(websiteHref.value).hostname.replace(/^www\./, '') } catch { return websiteField.value?.value ?? '' }
})

// ── Map section ───────────────────────────────────────────────────────────────
// Prefer explicit Google Maps field; extract query if it's a full URL; else fall back to address.
const mapQuery = computed(() => {
  const gmaps = parsedContact.value.find(f => f.prefix === 'Google Maps')
  if (gmaps) {
    if (gmaps.value.startsWith('http')) {
      try {
        const u = new URL(gmaps.value)
        return u.searchParams.get('q') || u.searchParams.get('daddr') || gmaps.value
      } catch { return gmaps.value }
    }
    return gmaps.value
  }
  return vendorData.value?.address ?? null
})

const mapsUrl = computed(() => {
  const gmaps = parsedContact.value.find(f => f.prefix === 'Google Maps')
  if (gmaps?.href) return gmaps.href
  if (vendorData.value?.address) return `https://maps.google.com/?q=${encodeURIComponent(vendorData.value.address)}`
  return '#'
})

// ── Social / messaging actions ────────────────────────────────────────────────
// Order: WhatsApp first (highest utility), then socials in contact[] order.
// Call and Email are in the contact list above — not duplicated here.
type SocialAction = { key: string; icon: string; label: string; href: string }

const socialActions = computed((): SocialAction[] => {
  const actions: SocialAction[] = []
  const added = new Set<string>()

  // WhatsApp: use explicit field; else derive from phone number
  const waField = parsedContact.value.find(f => f.prefix === 'WhatsApp')
  if (waField?.href) {
    actions.push({ key: 'whatsapp', icon: 'bi-whatsapp', label: 'WhatsApp', href: waField.href })
    added.add('whatsapp')
  } else if (phoneField.value) {
    const digits = phoneField.value.value.replace(/[\s\-+().]/g, '')
    if (digits) {
      actions.push({ key: 'whatsapp', icon: 'bi-whatsapp', label: 'WhatsApp', href: `https://wa.me/${digits}` })
      added.add('whatsapp')
    }
  }

  // All social fields in contact order
  for (const f of parsedContact.value) {
    const meta = CONTACT_FIELD_MAP[f.prefix]
    if (meta?.isSocial && meta.socialKey && !added.has(meta.socialKey) && f.href) {
      actions.push({ key: meta.socialKey, icon: meta.socialIcon!, label: meta.socialLabel!, href: f.href })
      added.add(meta.socialKey)
    }
  }

  // Directions — always last if a location is available
  if (mapQuery.value && mapsUrl.value !== '#') {
    actions.push({ key: 'directions', icon: 'bi-sign-turn-right-fill', label: 'Directions', href: mapsUrl.value })
  }

  return actions
})

// ── vCard download ────────────────────────────────────────────────────────────
function downloadVCard() {
  if (!vendorData.value) return
  const vCard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${vendorData.value.displayName}`,
    `ORG:${vendorData.value.displayName}`,
    phoneField.value   ? `TEL:${phoneField.value.value}`   : '',
    emailField.value   ? `EMAIL:${emailField.value.value}` : '',
    vendorData.value.address     ? `ADR:;;${vendorData.value.address};;;;` : '',
    vendorData.value.description ? `NOTE:${vendorData.value.description}` : '',
    'END:VCARD',
  ].filter(Boolean).join('\n')

  const blob = new Blob([vCard], { type: 'text/vcard' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${vendorData.value.name}.vcf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Share ─────────────────────────────────────────────────────────────────────
async function shareCard() {
  if (!vendorData.value) return
  const shareData = {
    title: vendorData.value.displayName,
    text: vendorData.value.description || `Contact information for ${vendorData.value.displayName}`,
    url: window.location.href,
  }
  if (navigator.share) {
    try { await navigator.share(shareData) } catch { /* user cancelled */ }
  } else {
    await navigator.clipboard.writeText(window.location.href)
  }
}

// ── Data fetch ────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/vendor/${vendorName}`)
    if (!res.ok) {
      if (res.status === 404) throw new Error('Vendor not found')
      if (res.status === 403) throw new Error('This vendor card is not available')
      throw new Error(`Failed to load vendor card: ${res.status}`)
    }
    vendorData.value = await res.json()
    // If the vendor requires login and the user isn't logged in, open the modal.
    // We never redirect — just gate the content behind the modal.
    if (vendorData.value?.requireLogin && !isLoggedIn.value) {
      loginModalOpen.value = true
    }
    // Track vendor contact page view (fires regardless of login state)
    analytics.track('vendor_contact_view', { vendorId: vendorData.value?.id })
  } catch (err: any) {
    error.value = err.message || 'An error occurred while loading the vendor card'
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
/* ── Page layout ─────────────────────────────────────────────────────────── */
.vendor-card-page {
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

.top-section {
  background: linear-gradient(180deg, #F5F2EE 0%, #EBE7E1 100%);
  padding: 3rem 1rem 5.5rem;
  flex-shrink: 0;
}

.bottom-section {
  background: linear-gradient(135deg, #D6C6AA 0%, #CBB897 100%);
  flex: 1;
  padding: 0 1rem 3.5rem;
  display: flex;
  align-items: flex-start;
}

/* ── Vendor name / tagline ───────────────────────────────────────────────── */
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
  margin: 0 auto;
  line-height: 1.5;
  font-weight: 400;
  max-width: 280px;
}

/* ── Contact card ────────────────────────────────────────────────────────── */
.contact-card {
  max-width: 360px;
  width: 100%;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 12px 44px rgba(0, 0, 0, 0.14);
  margin-top: -2rem;
  /* overflow stays visible so the logo circle isn't clipped */
  overflow: visible;
  position: relative;
}

/* ── Logo circle ─────────────────────────────────────────────────────────── */
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
  overflow: hidden;
  z-index: 2;
}

.logo-circle i { font-size: 2.1rem; color: #BD945A; }

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

/* ── Contact section ─────────────────────────────────────────────────────── */
.contact-section {
  padding: 4.5rem 1.75rem 1rem;
}

.section-heading {
  font-family: 'Rufina', serif;
  font-weight: 600;
  color: #2c2416;
  text-align: center;
  margin-bottom: 1.25rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-size: 0.75rem;
}

/* ── Contact rows ────────────────────────────────────────────────────────── */
.contact-list {
  display: flex;
  flex-direction: column;
}

.contact-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.72rem 0;
  border-bottom: 1px solid #f2ede7;
}
.contact-row:last-child { border-bottom: none; }

.row-icon {
  font-size: 0.9rem;
  color: #BD945A;
  width: 15px;
  flex-shrink: 0;
  text-align: center;
}

.row-value {
  color: #1a1410;
  font-size: 0.93rem;
  font-weight: 500;
  text-decoration: none;
  flex: 1;
  line-height: 1.4;
  transition: color 0.18s;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
a.row-value:hover { color: #BD945A; }

/* Copy button — subtle, inline, ghost */
.copy-btn {
  background: none;
  border: none;
  padding: 5px 6px;
  cursor: pointer;
  color: #c8b99e;
  border-radius: 5px;
  font-size: 0.78rem;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}
.copy-btn:hover   { color: #BD945A; background: #fdf6ec; }
.copy-btn.copied  { color: #6aaa82; }

/* ── Business hours display ──────────────────────────────────────────────── */
.hours-block {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.4rem;
  flex: 1;
}
.hours-days { font-size: 0.93rem; font-weight: 600; color: #1a1410; }
.hours-sep  { color: #BD945A; font-size: 0.82rem; }
.hours-time { font-size: 0.88rem; color: #6c6560; font-weight: 400; }

/* ── Map section ─────────────────────────────────────────────────────────── */
.map-section {
  margin: 0.75rem 1.75rem 0.25rem;
}

.map-frame-wrap {
  width: 100%;
  height: 160px;
  overflow: hidden;
  border-radius: 6px;
  border: none;
  position: relative;
  /* Refined shadow ring — no solid border line */
  box-shadow: 0 0 0 1px rgba(189, 148, 90, 0.28), 0 4px 16px rgba(0, 0, 0, 0.09);
}

.map-embed {
  /* Pull the iframe up to hide Google Maps' own header bar */
  position: absolute;
  top: -46px;
  left: 0;
  width: 100%;
  height: calc(100% + 46px);
  border: none;
  display: block;
  /* Warm sepia cast to pull the map into the cream/gold palette */
  filter: sepia(0.45) saturate(0.8) brightness(0.97);
}

/* Overlay: blocks pointer interaction AND adds a subtle warm tone on top */
.map-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  cursor: default;
  background: rgba(210, 175, 110, 0.1);
  mix-blend-mode: multiply;
}

/* ── Quick Links section ─────────────────────────────────────────────────── */
.quick-links-section {
  padding: 1.4rem 1.75rem 0.6rem;
}

.quick-links-heading {
  font-family: 'Rufina', serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: #2c2416;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0 0 0.85rem;
}

.social-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1.35rem;
}

.social-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-decoration: none;
}

/* No circles — just the icon itself */
.social-btn i {
  font-size: 1.45rem;
  color: #BD945A;
  display: block;
  line-height: 1;
  transition: color 0.18s, transform 0.18s;
}

.social-btn:hover i {
  color: #9a7240;
  transform: translateY(-2px);
}

.social-btn span {
  font-size: 0.58rem;
  font-weight: 600;
  color: #9a8a78;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* ── Decorative divider ──────────────────────────────────────────────────── */
.card-divider {
  height: 1px;
  background: linear-gradient(to right, transparent 6%, #e6ddd2 50%, transparent 94%);
  margin: 0.6rem 1.75rem 0;
  border-radius: 2px;
}

/* ── Primary CTAs — pill shaped, not circles ─────────────────────────────── */
.card-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.75rem 1.75rem;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.58rem 1.35rem;
  border-radius: 100px;
  font-size: 0.84rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  border: none;
  transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  white-space: nowrap;
}

.cta-outline {
  background: #ffffff;
  color: #BD945A;
  border: 1.5px solid #BD945A;
  box-shadow: 0 2px 8px rgba(189, 148, 90, 0.1);
}
.cta-outline:hover {
  background: #fdf6ec;
  box-shadow: 0 4px 14px rgba(189, 148, 90, 0.18);
  transform: translateY(-1px);
}

.cta-filled {
  background: #BD945A;
  color: #ffffff;
  box-shadow: 0 3px 10px rgba(189, 148, 90, 0.3);
}
.cta-filled:hover {
  background: #a37d45;
  box-shadow: 0 5px 16px rgba(189, 148, 90, 0.38);
  transform: translateY(-1px);
}

/* ── Mobile ──────────────────────────────────────────────────────────────── */
@media (max-width: 576px) {
  .top-section      { padding: 2.25rem 1rem 4rem; }
  .bottom-section   { padding: 0 0.75rem 2.75rem; }
  .vendor-name      { font-size: 1.65rem; }
  .vendor-tagline   { font-size: 0.9rem; }
  .contact-card     { max-width: 100%; border-radius: 14px; }
  .contact-section  { padding: 3.5rem 1.35rem 0.75rem; }
  .quick-links-section { padding: 0.85rem 1.35rem 0.4rem; }
  .social-row          { gap: 1rem; }
  .card-actions        { padding: 1rem 1.35rem 1.5rem; gap: 0.6rem; }
  .cta-btn             { padding: 0.55rem 1.1rem; font-size: 0.82rem; }
  .map-section         { margin: 0.6rem 1.35rem 0; }
  .map-frame-wrap      { height: 140px; }
  .social-btn i        { font-size: 1.3rem; }
}
</style>
