<template>
  <div class="pk-landing">
    <Navbar />

    <!-- HERO -->
    <section id="hero" class="pk-hero text-white">
      <div class="pk-hero-overlay"></div>
      <div class="pk-hero-qr d-none d-lg-block"></div>
      <div class="container h-100 position-relative">
        <div class="row align-items-center h-100 py-5">
          <div class="col-lg-10 col-xl-7">
            <h1 class="display-2 mb-4 pk-reveal" data-anim="animate__fadeInUp">Your Event... <br> <span class="text-primary">Digitally Presented.</span></h1>
            <p class="lead mb-4 pk-reveal" data-anim="animate__fadeInUp" data-delay="100"><strong><em>Peshkash</em></strong> turns simple QR codes into rich, mobile-first pages — menus, exhibits, and stories... so guests get everything they need in seconds.</p>
            <div class="d-flex flex-column flex-sm-row gap-3 pk-reveal" data-anim="animate__fadeInUp" data-delay="200">
              <a href="#pricing" class="btn btn-primary btn-lg">Get Started</a>
              <a href="#solutions" class="btn btn-outline-light btn-lg">See How It Works</a>
            </div>
            <br>
            <ul class="list-inline mt-4 pk-reveal" data-anim="animate__fadeInUp" data-delay="300">
              <li class="list-inline-item badge bg-light text-dark rounded-pill px-3 py-2">No app needed</li>
              <li class="list-inline-item badge bg-light text-dark rounded-pill px-3 py-2">Reusable QRs</li>
              <li class="list-inline-item badge bg-light text-dark rounded-pill px-3 py-2">Real-time updates</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- WHY IT MATTERS -->
    <section id="why" class="py-5 pk-section">
      <div class="container">
        <h2 class="text-center mb-3 display-5 pk-heading pk-reveal" data-anim="animate__fadeInUp">Why it matters — for guests & vendors</h2>
        <br>
        <p class="text-center text-muted mb-5 pk-reveal" data-anim="animate__fadeInUp" data-delay="100">Technology should feel invisible.
          <br>
          Peshkash blends the physical with the digital so everyone wins.
        </p>
        <div class="row g-4">
          <div class="col-md-6 pk-reveal" data-anim="animate__fadeInUp">
            <div class="card h-100 pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body text-center p-4">
                <div class="pk-icon-circle mb-3 mx-auto">
                  <i class="bi bi-people fs-2 text-primary"></i>
                </div>
                <h4 class="card-title mb-3">Guests</h4>
                <ul class="list-unstyled text-start mb-0 px-3">
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Touchless menus, no app install</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Fast scans & readable pages</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>One-tap share</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="col-md-6 pk-reveal" data-anim="animate__fadeInUp" data-delay="200">
            <div class="card h-100 pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body text-center p-4">
                <div class="pk-icon-circle mb-3 mx-auto">
                  <i class="bi bi-shop fs-2 text-primary"></i>
                </div>
                <h4 class="card-title mb-3">Vendors &amp; Organizers</h4>
                <ul class="list-unstyled text-start mb-0 px-3">
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Reusable physical QRs</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Event-based activation</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Simple updates + optional analytics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <br>
        <p class="text-center text-primary"> So that, no one is left behind in the fast paced world of Technology...</p>
        <br>
      </div>
    </section>

    <!-- SOLUTIONS -->
    <section id="solutions" class="py-5 pk-section pk-section-solutions">
      <div class="container">
        <h2 class="text-center mb-3 display-5 text-white pk-heading pk-reveal" data-anim="animate__fadeInUp">One simple system. Many problems solved.</h2>
        <p class="text-center text-primary mb-5 pk-reveal" data-anim="animate__fadeInUp" data-delay="100">Connect real-world touchpoints to effortless digital experiences.</p>
        <div class="row g-4">
          <div class="col-6 col-lg-4 pk-reveal" data-anim="animate__fadeInUp">
            <div class="card h-100 text-center pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body p-4">
                <i class="bi bi-qr-code-scan fs-1 text-primary mb-3 d-block"></i>
                <h5 class="fw-bold mb-2">Simple &amp; Physical</h5>
                <p class="text-muted small mb-0">Elegant QR plates—scan and go.</p>
              </div>
            </div>
          </div>
          <div class="col-6 col-lg-4 pk-reveal" data-anim="animate__fadeInUp" data-delay="100">
            <div class="card h-100 text-center pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body p-4">
                <i class="bi bi-clock-history fs-1 text-primary mb-3 d-block"></i>
                <h5 class="fw-bold mb-2">Event-Based Pricing</h5>
                <p class="text-muted small mb-0">Activate for 6 hours; extend as needed.</p>
              </div>
            </div>
          </div>
          <div class="col-6 col-lg-4 pk-reveal" data-anim="animate__fadeInUp" data-delay="200">
            <div class="card h-100 text-center pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body p-4">
                <i class="bi bi-journal-richtext fs-1 text-primary mb-3 d-block"></i>
                <h5 class="fw-bold mb-2">Detailed Pages</h5>
                <p class="text-muted small mb-0">Menus, photos, notes, allergen info.</p>
              </div>
            </div>
          </div>
          <div class="col-6 col-lg-4 pk-reveal" data-anim="animate__fadeInUp" data-delay="300">
            <div class="card h-100 text-center pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body p-4">
                <i class="bi bi-globe fs-1 text-primary mb-3 d-block"></i>
                <h5 class="fw-bold mb-2">Looks Like a Website</h5>
                <p class="text-muted small mb-0">Shareable links for vendors &amp; events.</p>
              </div>
            </div>
          </div>
          <div class="col-6 col-lg-4 pk-reveal" data-anim="animate__fadeInUp" data-delay="400">
            <div class="card h-100 text-center pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body p-4">
                <i class="bi bi-phone fs-1 text-primary mb-3 d-block"></i>
                <h5 class="fw-bold mb-2">Zero App Install</h5>
                <p class="text-muted small mb-0">Frictionless for everyone.</p>
              </div>
            </div>
          </div>
          <div class="col-6 col-lg-4 pk-reveal" data-anim="animate__fadeInUp" data-delay="500">
            <div class="card h-100 text-center pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body p-4">
                <i class="bi bi-graph-up fs-1 text-primary mb-3 d-block"></i>
                <h5 class="fw-bold mb-2">Vendors Stay Ahead</h5>
                <p class="text-muted small mb-0">Modernize without heavy software.</p>
              </div>
            </div>
          </div>
        </div>
        <div class="row text-center text-white py-4 mt-3">
          <div class="col-md-4 pk-reveal" data-anim="animate__fadeIn">
            <span class="fs-5">⚡ ~2s average load</span>
          </div>
          <div class="col-md-4 pk-reveal" data-anim="animate__fadeIn" data-delay="100">
            <span class="fs-5">▦ 1 QR, many events</span>
          </div>
          <div class="col-md-4 pk-reveal" data-anim="animate__fadeIn" data-delay="200">
            <span class="fs-5">🛡️ Secure links</span>
          </div>
        </div>
      </div>
    </section>


    <section id="pricing" class="py-5 pk-section pk-section-pricing">
      <div class="container">
        <h2 class="text-center mb-3 display-5 pk-heading pk-reveal" data-anim="animate__fadeInUp">Simple, event-ready pricing</h2>
        <p class="text-center text-muted mb-5 pk-reveal" data-anim="animate__fadeInUp" data-delay="100">Start small. Scale as you go.</p>
        <div class="row g-4 justify-content-center">
          <div class="col-md-4 col-lg-3 pk-reveal" data-anim="animate__zoomIn">
            <div class="card h-100 text-center pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body d-flex flex-column p-4">
                <h5 class="card-title text-muted mb-3">Starter</h5>
                <div class="display-6 fw-bold text-primary mb-2">₹799</div>
                <div class="text-muted small mb-4">per event (4 hours)</div>
                <ul class="list-unstyled mb-4 text-start small">
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Up to 25 QRs</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Menu Onboarding</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Vendor Page</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Logo Design</li>
                </ul>
                <div class="mt-auto">
                  <a href="#contact" class="btn btn-outline-primary w-100">Choose Starter</a>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4 col-lg-3 pk-reveal" data-anim="animate__zoomIn" data-delay="100">
            <div class="card h-100 text-center pk-card border-primary shadow rounded-4 pk-tilt position-relative overflow-hidden">
              <div class="bg-primary text-white py-1 text-uppercase small fw-bold position-absolute top-0 w-100 start-0">Most Popular</div>
              <div class="card-body d-flex flex-column p-4 pt-5">
                <h5 class="card-title text-primary mb-3">Pro</h5>
                <div class="display-6 fw-bold text-primary mb-2">₹1,299</div>
                <div class="text-muted small mb-4">per event (6 hours)</div>
                <ul class="list-unstyled mb-4 text-start small">
                  <li class="mb-2"><i class="bi bi-check2-circle text-primary me-2"></i>Up to 40 Menu Items</li>
                  <li class="mb-2"><i class="bi bi-check2-circle text-primary me-2"></i>Logo Design</li>
                  <li class="mb-2"><i class="bi bi-check2-circle text-primary me-2"></i>Menu Onboarding</li>
                  <li class="mb-2"><i class="bi bi-check2-circle text-primary me-2"></i>Live Menu Page</li>
                  <li class="mb-2"><i class="bi bi-check2-circle text-primary me-2"></i>Custom Content Gen</li>
                  <li class="mb-2"><i class="bi bi-check2-circle text-primary me-2"></i>Live support</li>
                  <li class="mb-2"><i class="bi bi-check2-circle text-primary me-2"></i>Custom QR Design</li>
                </ul>
                <div class="mt-auto">
                  <a href="#contact" class="btn btn-primary w-100">Choose Pro</a>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4 col-lg-3 pk-reveal" data-anim="animate__zoomIn" data-delay="200">
            <div class="card h-100 text-center pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body d-flex flex-column p-4">
                <h5 class="card-title text-muted mb-3">Plus</h5>
                <div class="display-6 fw-bold text-primary mb-2">Custom</div>
                <div class="text-muted small mb-4">quote</div>
                <ul class="list-unstyled mb-4 text-start small">
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Bulk events</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Branding &amp; custom domains</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Advanced analytics</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Long term plans</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Custom Pages</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Unlimited List Items</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Permanent Vendor Page</li>
                  <li class="mb-2"><i class="bi bi-check2 text-primary me-2"></i>Event Page</li>
                </ul>
                <div class="mt-auto">
                  <a href="#contact" class="btn btn-outline-primary w-100">Contact Us</a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p class="text-center text-info text-muted mt-4 pk-reveal" data-anim="animate__fadeInUp" data-delay="300"><strong>+ Offer </strong> One-time QR plates available starting just ₹49/-</p>
      </div>
    </section>

    <!-- CONTACT -->
    <section id="contact" class="py-5 pk-section pk-section-contact">
      <div class="container">
        <h2 class="text-center text-white mb-3 display-4 pk-heading pk-reveal" data-anim="animate__fadeInUp">Let’s make your next event effortless.</h2>
        <p class="text-center text-primary mb-5 pk-reveal" data-anim="animate__fadeInUp" data-delay="100">Tell us about your event or become a vendor partner.</p>
        <div class="row g-4">
          <div class="col-md-6 pk-reveal" data-anim="animate__fadeInUp">
            <div class="card h-100 pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body p-4">
                <div class="d-flex align-items-center mb-4">
                  <div class="pk-icon-circle me-3">
                    <i class="bi bi-telephone-fill fs-4 text-primary"></i>
                  </div>
                  <div>
                    <div class="fw-bold">Phone</div>
                    <div class="text-muted">+91-9041716953</div>
                  </div>
                </div>
                <div class="d-flex align-items-center mb-4">
                  <div class="pk-icon-circle me-3">
                    <i class="bi bi-envelope-fill fs-4 text-primary"></i>
                  </div>
                  <div>
                    <div class="fw-bold">Email</div>
                    <div class="text-muted">contact@peshkash.app</div>
                  </div>
                </div>
                <div class="d-flex align-items-center">
                  <div class="pk-icon-circle me-3">
                    <i class="bi bi-whatsapp fs-4 text-primary"></i>
                  </div>
                  <div>
                    <div class="fw-bold">WhatsApp</div>
                    <div class="text-muted"><a href="https://wa.me/+919041716953" class="text-reset text-decoration-none">Chat on WhatsApp</a></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-6 pk-reveal" data-anim="animate__fadeInUp" data-delay="200">
            <div class="card h-100 pk-card border-0 shadow-sm rounded-4 pk-tilt">
              <div class="card-body p-4">
                <form action="mailto:hello@peshkash.app" method="post" enctype="text/plain">
                  <div class="mb-3">
                    <label for="name" class="form-label small text-uppercase fw-bold text-muted">Name</label>
                    <input id="name" name="name" type="text" class="form-control pk-input" required />
                  </div>
                  <div class="mb-3">
                    <label for="phone" class="form-label small text-uppercase fw-bold text-muted">Phone</label>
                    <input id="phone" name="phone" type="tel" class="form-control pk-input" />
                  </div>
                  <div class="mb-3">
                    <label for="email" class="form-label small text-uppercase fw-bold text-muted">Email</label>
                    <input id="email" name="email" type="email" class="form-control pk-input" required />
                  </div>
                  <div class="mb-3">
                    <label for="city" class="form-label small text-uppercase fw-bold text-muted">City</label>
                    <input id="city" name="city" type="text" class="form-control pk-input" />
                  </div>
                  <div class="mb-3">
                    <label for="message" class="form-label small text-uppercase fw-bold text-muted">Message</label>
                    <textarea id="message" name="message" rows="3" class="form-control pk-input"></textarea>
                  </div>
                  <button type="submit" class="btn btn-primary w-100">Send Message</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="py-5 bg-dark text-white">
      <div class="container text-center">
        <div class="row g-4">
          <div class="col-md-4">
            <p class="mb-0">Peshkash brings your event to life with elegant, QR-powered pages.</p>
          </div>
          <div class="col-md-4">
            <h6 class="text-primary">Quick links</h6>
            <ul class="list-unstyled">
              <li><a href="#hero" class="text-white text-decoration-none">About</a></li>
              <li><a href="#solutions" class="text-white text-decoration-none">How It Works</a></li>
              <li><a href="#pricing" class="text-white text-decoration-none">Pricing</a></li>
              <li><a href="#contact" class="text-white text-decoration-none">Contact</a></li>
            </ul>
          </div>
          <div class="col-md-4">
            <h6>Follow us</h6>
            <a href="#" class="text-white me-3" aria-label="LinkedIn"><i class="bi bi-linkedin fs-4"></i></a>
            <a href="#" class="text-white" aria-label="Instagram"><i class="bi bi-instagram fs-4"></i></a>
          </div>
        </div>
        <div class="text-center mt-4">
          © {{ new Date().getFullYear() }} • COMPANY_NAME
        </div>
      </div>
    </footer>

    <button v-show="showTop" @click="scrollToTop" class="btn btn-primary pk-back-top" aria-label="Back to top">
      <i class="bi bi-arrow-up"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Navbar from '../components/Navbar.vue';

const showTop = ref(false);

onMounted(() => {
  const els = document.querySelectorAll<HTMLElement>('.pk-reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        const anim = el.dataset.anim || 'animate__fadeInUp';
        const delay = Number(el.dataset.delay || 0);
        setTimeout(() => {
          el.classList.add('animate__animated', anim, 'pk-visible');
        }, delay);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.3 });
  els.forEach((el) => io.observe(el));

  const onScroll = () => {
    showTop.value = window.scrollY > 300;
  };
  window.addEventListener('scroll', onScroll);
});

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
</script>

<style scoped>
.pk-hero {
  position: relative;
  min-height: 100vh;
  padding-top: 6rem;
  padding-bottom: 6rem;
  background: url(../assets/peshkash-demo-hero.png) center/cover fixed no-repeat;
  overflow: hidden;
}

@media (max-width: 991.98px) {
  .pk-hero {
    padding-top: 4rem;
    padding-bottom: 4rem;
    background-attachment: scroll;
  }
}

.pk-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(rgba(var(--bs-primary-rgb), 0.7), rgba(0, 0, 0, 0.7));
}

.pk-hero-qr {
  position: absolute;
  top: 5%;
  right: 5%;
  height: 80%;
  width: 40%;
  background: url(../assets/peshkashqrhero.png) center / contain no-repeat;
  opacity: 0.4;
}

.pk-heading {
  color: var(--bs-accent3, var(--bs-primary));
}

.pk-section {
  position: relative;
  z-index: 0;
  background: linear-gradient(180deg, rgba(var(--bs-primary-rgb), .05), #fff)
}

.pk-section::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
}

.pk-section-solutions {
  background: url(../assets/peshkash-demo-section-placed.png) center/cover fixed no-repeat;
  overflow: hidden;
}

.pk-section-pricing {
  background: linear-gradient(180deg, rgb(239, 239, 239), rgb(255, 247, 237))
}

.pk-section-contact {
  background: none;
}

.pk-section-contact::before {
  background: url(../assets/peshkash-demo-section-placed.png) center/cover fixed no-repeat;
}

.pk-tilt {
  transition: transform 0.3s;
}
.pk-tilt:hover {
  transform: translateY(-3px);
}

.pk-featured {
  border: 2px solid var(--bs-primary);
  box-shadow: 0 0 1rem rgba(0, 0, 0, 0.1);
}

.pk-back-top {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 1000;
  opacity: 0.8;
}

.pk-reveal {
  opacity: 0;
}
.pk-visible {
  opacity: 1;
}

/* New Utility Classes */
.pk-card {
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}

.pk-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.1) !important;
}

.pk-icon-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(var(--bs-primary-rgb), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pk-input {
  border: none;
  border-bottom: 2px solid #eee;
  border-radius: 0;
  padding: 0.75rem 0;
  background: transparent;
}

.pk-input:focus {
  box-shadow: none;
  border-color: var(--bs-primary);
  background: transparent;
}

:global(html, body) {
  scroll-behavior: smooth;
}
</style>