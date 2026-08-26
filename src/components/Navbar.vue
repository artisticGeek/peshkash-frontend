<template>
<nav class="navbar navbar-dark navbar-professional">
  <div class="container-fluid px-3 px-md-4">
    <a class="navbar-brand py-2" href="/#hero">
      <PeshkashLogo variant="dark-bg" :height="30" />
    </a>

    <!-- Desktop inline nav -->
    <div class="d-none d-lg-flex align-items-center gap-1 me-3">
      <a class="nav-link-inline" href="/#how">How It Works</a>
      <a class="nav-link-inline" href="/#vendors">For Vendors</a>
      <a class="nav-link-inline" href="/#pricing">Pricing</a>
      <a class="nav-link-inline" href="/#contact">Contact</a>
    </div>
    <a href="/#contact" class="btn btn-pk-gold d-none d-lg-inline-flex align-items-center gap-2">
      <i class="bi bi-whatsapp"></i> Get Started
    </a>

    <!-- Mobile toggler -->
    <button class="navbar-toggler border-0 px-2 d-lg-none" type="button"
      data-bs-toggle="offcanvas" data-bs-target="#offcanvasDarkNavbar"
      aria-controls="offcanvasDarkNavbar" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="offcanvas offcanvas-end text-bg-dark" tabindex="-1" id="offcanvasDarkNavbar" aria-labelledby="offcanvasDarkNavbarLabel">
      <div class="offcanvas-header">
        <PeshkashLogo variant="dark-bg" :height="28" />
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body d-flex flex-column">
        <ul class="navbar-nav flex-grow-1">
          <li class="nav-item">
            <a class="nav-link py-3" href="/#hero" data-bs-dismiss="offcanvas">
              <i class="bi bi-house me-2 text-gold"></i>Home
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link py-3" href="/#how" data-bs-dismiss="offcanvas">
              <i class="bi bi-list-check me-2 text-gold"></i>How It Works
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link py-3" href="/#vendors" data-bs-dismiss="offcanvas">
              <i class="bi bi-shop me-2 text-gold"></i>For Vendors
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link py-3" href="/#pricing" data-bs-dismiss="offcanvas">
              <i class="bi bi-tag me-2 text-gold"></i>Pricing
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link py-3" href="/#faq" data-bs-dismiss="offcanvas">
              <i class="bi bi-question-circle me-2 text-gold"></i>FAQ
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link py-3" href="/#contact" data-bs-dismiss="offcanvas">
              <i class="bi bi-telephone me-2 text-gold"></i>Contact
            </a>
          </li>
        </ul>

        <!-- Bottom CTA in side menu -->
        <div class="offcanvas-footer mt-auto pt-4 border-top border-secondary">
          <a href="https://wa.me/+919041716953" target="_blank" rel="noopener"
            class="btn btn-pk-gold w-100 mb-3 d-flex align-items-center justify-content-center gap-2">
            <i class="bi bi-whatsapp"></i> Chat on WhatsApp
          </a>
          <p class="text-muted small text-center mb-0">+91-9041716953 · contact@peshkash.app</p>
        </div>
      </div>
    </div>
  </div>
</nav>
</template>

<script setup lang="ts">
import PeshkashLogo from '@/components/PeshkashLogo.vue'
</script>

<style scoped>
.navbar-professional {
  padding: 0.3rem 0;
  background: rgba(26, 20, 16, 0.97);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 1px 0 rgba(189, 148, 90, 0.18);
  position: sticky;
  top: 0;
  z-index: 1030;
}

.navbar-brand {
  padding: 0.2rem 0;
  transition: opacity 0.25s;
  display: flex;
  align-items: center;
}
.navbar-brand:hover { opacity: 0.82; }

/* Desktop inline links */
.nav-link-inline {
  color: rgba(255,255,255,0.75);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  transition: all 0.2s;
  letter-spacing: 0.01em;
}
.nav-link-inline:hover {
  color: #BD945A;
  background: rgba(189,148,90,0.1);
}

/* Gold CTA button */
.btn-pk-gold {
  background: linear-gradient(135deg, #BD945A, #D4A87A);
  color: #fff;
  border: none;
  font-weight: 600;
  font-size: 0.88rem;
  padding: 0.5rem 1.1rem;
  border-radius: 8px;
  transition: all 0.2s;
}
.btn-pk-gold:hover {
  background: linear-gradient(135deg, #C9A368, #E0B878);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(189,148,90,0.35);
}

/* Mobile offcanvas */
.offcanvas.text-bg-dark {
  background: #1A1410 !important;
  border-left: 1px solid rgba(189,148,90,0.2);
}
.offcanvas-header {
  border-bottom: 1px solid rgba(255,255,255,0.07);
  padding: 1rem 1.5rem;
}
.offcanvas-body { padding: 0.5rem 1.5rem 1.5rem; }

.navbar-nav .nav-link {
  font-size: 1rem;
  font-weight: 500;
  color: rgba(255,255,255,0.8);
  border-radius: 8px;
  padding-left: 0.75rem !important;
  transition: all 0.2s;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.navbar-nav .nav-link:hover {
  color: #BD945A;
  background: rgba(189,148,90,0.08);
  padding-left: 1.25rem !important;
}

.text-gold { color: #BD945A !important; }

.navbar-toggler {
  border: 1px solid rgba(255,255,255,0.15) !important;
  transition: all 0.2s;
}
.navbar-toggler:hover {
  border-color: #BD945A !important;
  background: rgba(189,148,90,0.08);
}
.navbar-toggler:focus {
  box-shadow: 0 0 0 0.15rem rgba(189,148,90,0.25);
}
</style>
