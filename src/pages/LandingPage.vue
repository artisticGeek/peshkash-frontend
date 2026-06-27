<template>
  <div class="site">
    <Navbar />

    <!-- ═══════════════════════ HERO ═══════════════════════ -->
    <section class="hero" id="hero">
      <!-- Three.js canvas — behind everything -->
      <canvas ref="canvasRef" class="hero-canvas" aria-hidden="true"></canvas>

      <div class="hero-content">
        <div class="hero-pill rev">
          <span class="h-dot"></span>
          Digital insights · Offline businesses · India
        </div>

        <h1 class="hero-h1 rev" style="--d:80ms">
          Physical presence.<br>
          <span class="h-em">Digital<br>intelligence.</span>
        </h1>

        <p class="hero-p rev" style="--d:180ms">
          Every customer who scans your QR becomes a data point. Every interaction, a connection.
          Peshkash gives any offline business — bakeries, art studios, market stalls, exhibitions —
          a digital identity that grows with every scan.
        </p>

        <div class="hero-btns rev" style="--d:260ms">
          <a href="https://wa.me/+919041716953" target="_blank" rel="noopener" class="cta-wa">
            <i class="bi bi-whatsapp"></i> Get started free
          </a>
          <a href="#how" class="cta-down">
            See how it works <i class="bi bi-arrow-down"></i>
          </a>
        </div>

        <!-- live counter strip -->
        <div class="hero-strip rev" style="--d:340ms">
          <div class="h-stat"><b>₹49</b><span>QR plate</span></div>
          <div class="h-sep"></div>
          <div class="h-stat"><b>&lt;2s</b><span>page load</span></div>
          <div class="h-sep"></div>
          <div class="h-stat"><b>0</b><span>apps needed</span></div>
          <div class="h-sep"></div>
          <div class="h-stat"><b>∞</b><span>reuses</span></div>
        </div>
      </div>

      <!-- right: scan → insights visual -->
      <div class="hero-right rev" style="--d:200ms" aria-hidden="true">
        <div class="scan-scene">
          <div class="ss-qr">
            <img src="../assets/peshkashqrhero.png" alt="" class="ss-qr-img" />
            <span class="ss-live"><span class="live-pulse"></span> Live scan</span>
          </div>

          <div class="ss-beam">
            <svg width="56" height="120" viewBox="0 0 56 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="beamGrad" x1="28" y1="0" x2="28" y2="120" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#e07830" stop-opacity="0"/>
                  <stop offset="50%" stop-color="#e07830" stop-opacity="0.8"/>
                  <stop offset="100%" stop-color="#e07830" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <rect x="27" y="0" width="2" height="120" fill="url(#beamGrad)"/>
              <circle cx="28" cy="60" r="4" fill="#e07830" opacity="0.9"/>
            </svg>
          </div>

          <div class="ss-phone">
            <div class="ss-phone-shell">
              <div class="ss-notch"></div>
              <img src="../assets/peshkash-demo-section.png" alt="" class="ss-screen" />
            </div>
            <div class="ss-insights">
              <div class="ss-row"><i class="bi bi-eye-fill"></i><span>47 views today</span></div>
              <div class="ss-row"><i class="bi bi-person-fill"></i><span>12 new contacts</span></div>
              <div class="ss-row"><i class="bi bi-graph-up-arrow"></i><span>↑ 23% this week</span></div>
            </div>
          </div>
        </div>

        <!-- floating ambient chips -->
        <div class="f-chip fc-1"><i class="bi bi-palette2"></i> Artists</div>
        <div class="f-chip fc-2"><i class="bi bi-bag-heart"></i> Bakers</div>
        <div class="f-chip fc-3"><i class="bi bi-shop"></i> Vendors</div>
        <div class="f-chip fc-4"><i class="bi bi-camera"></i> Studios</div>
      </div>

      <div class="hero-scroll-hint" aria-hidden="true">
        <span>Scroll</span>
        <div class="scroll-line"></div>
      </div>
    </section>

    <!-- ═══════════════════════ TICKER ═══════════════════════ -->
    <div class="ticker" aria-hidden="true">
      <div class="ticker-track">
        <template v-for="n in 5" :key="n">
          <span>Digital insights</span><em>·</em>
          <span>Offline businesses</span><em>·</em>
          <span>Artists · Bakers · Vendors</span><em>·</em>
          <span>No website needed</span><em>·</em>
          <span>QR plates from ₹49</span><em>·</em>
          <span>Live in 24 hours</span><em>·</em>
        </template>
      </div>
    </div>

    <!-- ═══════════════════════ BIG STATEMENT ═══════════════════════ -->
    <section class="statement" id="what">
      <div class="statement-inner">
        <p class="s-label rev">The idea</p>
        <h2 class="s-h2 rev" style="--d:60ms">
          Every scan is a<br>data point.<br>
          <em>Make them count.</em>
        </h2>
        <p class="s-body rev" style="--d:140ms">
          Your customers are already using their phones when they visit you. Peshkash makes that moment
          digital — a scan that shows them your world, and shows you what they care about.
          No website. No app. Just a QR that thinks.
        </p>
      </div>
      <div class="s-img-wrap rev" style="--d:100ms">
        <img src="../assets/peshkash-demo-section-placed.png" alt="QR in the real world" class="s-img" />
        <div class="s-img-float s-if-a">
          <i class="bi bi-qr-code-scan"></i> Scan
        </div>
        <div class="s-img-float s-if-b">
          <i class="bi bi-graph-up-arrow"></i> Insight
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ FOR EVERYONE ═══════════════════════ -->
    <section class="forall" id="forall">
      <div class="forall-head rev">
        <p class="s-label-light">Every offline business</p>
        <h2 class="forall-h2">This is for<br><em>you.</em></h2>
      </div>

      <div class="forall-list">
        <div class="fl-item rev" style="--d:0ms">
          <span class="fl-for">For the</span>
          <strong class="fl-who">baker</strong>
          <span class="fl-rest">who wants every customer to remember the recipe they loved — and find you again.</span>
        </div>
        <div class="fl-item rev" style="--d:50ms">
          <span class="fl-for">For the</span>
          <strong class="fl-who">artist</strong>
          <span class="fl-rest">who sells at weekend markets and wants visitors to buy prints long after the market closes.</span>
        </div>
        <div class="fl-item rev" style="--d:100ms">
          <span class="fl-for">For the</span>
          <strong class="fl-who">caterer</strong>
          <span class="fl-rest">who runs 30 events a year and wants the same QR plate working at every single one.</span>
        </div>
        <div class="fl-item rev" style="--d:150ms">
          <span class="fl-for">For the</span>
          <strong class="fl-who">studio owner</strong>
          <span class="fl-rest">who wants students to book classes, see the schedule, and share it with friends — from one scan.</span>
        </div>
        <div class="fl-item rev" style="--d:200ms">
          <span class="fl-for">For the</span>
          <strong class="fl-who">dhaba</strong>
          <span class="fl-rest">that's been here 40 years and is finally ready to be discovered by people 10km away.</span>
        </div>
        <div class="fl-item rev" style="--d:250ms">
          <span class="fl-for">For the</span>
          <strong class="fl-who">exhibition stall</strong>
          <span class="fl-rest">whose visitors leave forgetting them — until the QR on their table makes them unforgettable.</span>
        </div>
        <div class="fl-item rev" style="--d:300ms">
          <span class="fl-for">For</span>
          <strong class="fl-who">everyone</strong>
          <span class="fl-rest">who shows up in person, but disappears the moment their customer walks out the door.</span>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ WHAT YOU BUILD ═══════════════════════ -->
    <section class="products" id="products">

      <div class="prod-row prod-dark">
        <div class="prod-n" aria-hidden="true">01</div>
        <div class="prod-copy">
          <p class="s-label">Digital Pages</p>
          <h3 class="prod-h3">Your world,<br>one scan away.</h3>
          <p class="prod-p">Menus, product catalogues, artist portfolios, class schedules, ingredient lists — whatever your business needs people to see, we build it into a beautiful, scannable page. Updated by us, whenever you need.</p>
          <ul class="prod-list">
            <li><i class="bi bi-check2"></i> Rich photos, descriptions, categories</li>
            <li><i class="bi bi-check2"></i> Works on every phone, no download</li>
            <li><i class="bi bi-check2"></i> Update any time — live within hours</li>
          </ul>
        </div>
        <div class="prod-visual">
          <img src="../assets/peshkash-demo-section.png" alt="Digital page example" class="prod-img" />
        </div>
      </div>

      <div class="prod-row prod-cream">
        <div class="prod-n prod-n-cream" aria-hidden="true">02</div>
        <div class="prod-visual prod-visual-flip">
          <img src="../assets/peshkash-demo-section-placed.png" alt="QR plate at an event" class="prod-img" />
        </div>
        <div class="prod-copy">
          <p class="s-label-dark">Contact Intelligence</p>
          <h3 class="prod-h3-dark">Your business card,<br>but it thinks.</h3>
          <p class="prod-p-dark">A permanent digital identity — phone, email, location, hours, your story. Customers scan, save your contact, and share you. Every scan is logged. You see who's interested, when, and how often.</p>
          <ul class="prod-list-dark">
            <li><i class="bi bi-check2"></i> Always-live vendor profile</li>
            <li><i class="bi bi-check2"></i> Shareable across WhatsApp, Instagram</li>
            <li><i class="bi bi-check2"></i> Scan insights: views, unique visitors</li>
          </ul>
        </div>
      </div>

      <div class="prod-row prod-dark">
        <div class="prod-n" aria-hidden="true">03</div>
        <div class="prod-copy">
          <p class="s-label">Reusable QR Plates</p>
          <h3 class="prod-h3">One plate.<br>Every experience.<br>Forever.</h3>
          <p class="prod-p">Print a QR plate once — from ₹49 — and it works at every future event, every season, every new menu. We update what the QR shows. The plate stays the same.</p>
          <ul class="prod-list">
            <li><i class="bi bi-check2"></i> From ₹49, one-time purchase</li>
            <li><i class="bi bi-check2"></i> Activate different content per event</li>
            <li><i class="bi bi-check2"></i> Elegant printed plates, premium finish</li>
          </ul>
        </div>
        <div class="prod-visual prod-qr-visual">
          <div class="qr-plate-mock">
            <img src="../assets/peshkashqrhero.png" alt="QR plate" class="qr-plate-img" />
            <div class="qr-plate-label">Reuse this · Forever</div>
          </div>
        </div>
      </div>

    </section>

    <!-- ═══════════════════════ HOW ═══════════════════════ -->
    <section class="how" id="how">
      <div class="how-inner">
        <div class="how-head">
          <p class="s-label rev">How it works</p>
          <h2 class="how-h2 rev" style="--d:60ms">
            Three steps.<br>That's the whole story.
          </h2>
        </div>
        <div class="how-steps">
          <div class="how-step rev" style="--d:80ms">
            <div class="step-n">1</div>
            <h4>Tell us about your business</h4>
            <p>WhatsApp us what you want customers to see — your menu, catalogue, portfolio, schedule. We build your digital page in 24–48 hours.</p>
          </div>
          <div class="how-arrow" aria-hidden="true">
            <svg width="32" height="16" viewBox="0 0 32 16" fill="none"><path d="M0 8h28M20 1l8 7-8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="how-step rev" style="--d:140ms">
            <div class="step-n">2</div>
            <h4>Get your QR plate</h4>
            <p>We print a scannable QR plate for you (from ₹49). Place it anywhere customers will see it — table, wall, packaging, banner.</p>
          </div>
          <div class="how-arrow" aria-hidden="true">
            <svg width="32" height="16" viewBox="0 0 32 16" fill="none"><path d="M0 8h28M20 1l8 7-8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="how-step rev" style="--d:200ms">
            <div class="step-n">3</div>
            <h4>Watch your insights grow</h4>
            <p>Every scan is tracked. Every visitor counted. You see what's working, who's interested, and how your digital presence is growing — all from offline interactions.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ NUMBERS ═══════════════════════ -->
    <div class="numbar">
      <div class="n-item rev" style="--d:0ms"><b>₹49</b><span>QR plate · one time</span></div>
      <div class="n-sep"></div>
      <div class="n-item rev" style="--d:60ms"><b>24h</b><span>average setup time</span></div>
      <div class="n-sep"></div>
      <div class="n-item rev" style="--d:120ms"><b>&lt;2s</b><span>page load time</span></div>
      <div class="n-sep"></div>
      <div class="n-item rev" style="--d:180ms"><b>0</b><span>apps to install</span></div>
      <div class="n-sep"></div>
      <div class="n-item rev" style="--d:240ms"><b>∞</b><span>events per plate</span></div>
    </div>

    <!-- ═══════════════════════ PRICING ═══════════════════════ -->
    <section class="pricing" id="pricing">
      <div class="pricing-head rev">
        <p class="s-label">Pricing</p>
        <h2 class="pricing-h2 rev" style="--d:60ms">Pay per event.<br>No subscription. Ever.</h2>
        <p class="pricing-sub rev" style="--d:100ms">QR plates are a separate one-time purchase. Start small, scale as you grow.</p>
      </div>

      <div class="plans">
        <div class="plan rev" style="--d:80ms">
          <span class="plan-name">Starter</span>
          <div class="plan-price"><sup>₹</sup><b>799</b></div>
          <span class="plan-when">per session · 4 hours</span>
          <ul class="plan-list">
            <li><i class="bi bi-check2"></i> Up to 25 QR targets</li>
            <li><i class="bi bi-check2"></i> Page setup &amp; onboarding</li>
            <li><i class="bi bi-check2"></i> Vendor contact card</li>
            <li><i class="bi bi-check2"></i> Logo design</li>
          </ul>
          <a href="#contact" class="plan-btn outline">Get Started</a>
        </div>

        <div class="plan plan-pro rev" style="--d:140ms">
          <div class="plan-badge">Most Popular</div>
          <span class="plan-name">Pro</span>
          <div class="plan-price"><sup>₹</sup><b>1,299</b></div>
          <span class="plan-when">per session · 6 hours</span>
          <ul class="plan-list">
            <li><i class="bi bi-check2-circle"></i> Up to 40 items</li>
            <li><i class="bi bi-check2-circle"></i> Everything in Starter</li>
            <li><i class="bi bi-check2-circle"></i> AI-written copy</li>
            <li><i class="bi bi-check2-circle"></i> Custom QR design</li>
            <li><i class="bi bi-check2-circle"></i> Live support</li>
          </ul>
          <a href="#contact" class="plan-btn fill">Choose Pro</a>
        </div>

        <div class="plan rev" style="--d:200ms">
          <span class="plan-name">Business</span>
          <div class="plan-price-custom">Custom</div>
          <span class="plan-when">ongoing · bulk</span>
          <ul class="plan-list">
            <li><i class="bi bi-check2"></i> Unlimited events</li>
            <li><i class="bi bi-check2"></i> Custom domain</li>
            <li><i class="bi bi-check2"></i> Analytics dashboard</li>
            <li><i class="bi bi-check2"></i> Dedicated manager</li>
            <li><i class="bi bi-check2"></i> Long-term discounts</li>
          </ul>
          <a href="#contact" class="plan-btn outline">Talk to Us</a>
        </div>
      </div>

      <div class="plate-strip rev" style="--d:260ms">
        <i class="bi bi-qr-code fs-4 text-amber"></i>
        <div>
          <strong>Physical QR plates from ₹49 — one time, yours forever</strong>
          <span>Reuse the same plate for every future session. Zero recurring cost.</span>
        </div>
        <a href="#contact">Ask us →</a>
      </div>
    </section>

    <!-- ═══════════════════════ FAQ ═══════════════════════ -->
    <section class="faq" id="faq">
      <p class="s-label rev">FAQ</p>
      <h2 class="faq-h2 rev" style="--d:60ms">Straight answers.</h2>
      <div class="faq-grid">
        <div
          v-for="(q, i) in faqs"
          :key="i"
          class="faq-item rev"
          :style="`--d:${i * 40}ms`"
          :class="{ open: openQ === i }"
          @click="openQ = openQ === i ? -1 : i"
        >
          <div class="faq-q">{{ q.q }}<i :class="openQ === i ? 'bi bi-dash' : 'bi bi-plus'"></i></div>
          <p v-show="openQ === i" class="faq-a">{{ q.a }}</p>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ CONTACT ═══════════════════════ -->
    <section class="contact" id="contact">
      <div class="contact-left rev">
        <p class="s-label-light">Let's talk</p>
        <h2 class="contact-h2">Make your<br>offline presence<br><em>count.</em></h2>
        <p class="contact-sub">We do the setup. You run your business. Fastest reply on WhatsApp.</p>

        <a href="https://wa.me/+919041716953" target="_blank" rel="noopener" class="wa-big">
          <i class="bi bi-whatsapp"></i>
          <div>
            <strong>Chat on WhatsApp</strong>
            <small>Usually replies within the hour</small>
          </div>
        </a>

        <div class="contact-links">
          <a href="tel:+919041716953"><i class="bi bi-telephone-fill"></i> +91-9041716953</a>
          <a href="mailto:contact@peshkash.app"><i class="bi bi-envelope-fill"></i> contact@peshkash.app</a>
        </div>
      </div>

      <div class="contact-form rev" style="--d:100ms">
        <h4>Send a message</h4>
        <form action="mailto:contact@peshkash.app" method="post" enctype="text/plain">
          <div class="f-row">
            <label><span>Name</span><input name="name" type="text" placeholder="Your name" required /></label>
            <label><span>Phone</span><input name="phone" type="tel" placeholder="+91 90000 00000" /></label>
          </div>
          <label><span>Email</span><input name="email" type="email" placeholder="you@example.com" required /></label>
          <label>
            <span>I run a…</span>
            <select name="type">
              <option value="">Select</option>
              <option>Bakery / Food Business</option>
              <option>Art Studio / Gallery</option>
              <option>Restaurant / Dhaba</option>
              <option>Catering Business</option>
              <option>Hotel / Banquet Hall</option>
              <option>Exhibition / Market Stall</option>
              <option>Fitness / Wellness Studio</option>
              <option>Other offline business</option>
            </select>
          </label>
          <label><span>Message</span><textarea name="message" rows="3" placeholder="Tell us about your business…"></textarea></label>
          <button type="submit"><i class="bi bi-send-fill"></i> Send Message</button>
        </form>
      </div>
    </section>

    <!-- ═══════════════════════ FOOTER ═══════════════════════ -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <div class="fb-name">
            <i class="bi bi-qr-code-scan"></i>
            <span>Peshkash</span>
          </div>
          <p>Digital insights from offline experiences.</p>
          <div class="fb-social">
            <a href="https://wa.me/+919041716953" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="bi bi-whatsapp"></i></a>
            <a href="https://instagram.com/peshkash.app" target="_blank" rel="noopener" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
            <a href="mailto:contact@peshkash.app" aria-label="Email"><i class="bi bi-envelope"></i></a>
          </div>
        </div>
        <div class="footer-nav">
          <div class="fn-col">
            <h6>Product</h6>
            <a href="/#what">How It Works</a>
            <a href="/#products">Digital Pages</a>
            <a href="/#products">Contact Cards</a>
            <a href="/#pricing">Pricing</a>
          </div>
          <div class="fn-col">
            <h6>Company</h6>
            <a href="/#faq">FAQ</a>
            <a href="/#contact">Contact</a>
            <a href="https://wa.me/+919041716953" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© {{ new Date().getFullYear() }} Peshkash</span>
        <span>Digital insights from offline India</span>
      </div>
    </footer>

    <!-- Float WA -->
    <a href="https://wa.me/+919041716953" target="_blank" rel="noopener" class="float-wa" aria-label="WhatsApp">
      <i class="bi bi-whatsapp"></i>
    </a>
    <button v-show="showTop" @click="scrollToTop" class="float-top" aria-label="Back to top">
      <i class="bi bi-arrow-up"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import Navbar from '../components/Navbar.vue';
import * as THREE from 'three';

// ── refs ──────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null);
const showTop = ref(false);
const openQ = ref(0);

// ── FAQ data ──────────────────────────────────────────────
const faqs = [
  { q: 'Do my customers need to download anything?',
    a: 'Nothing. They scan with their camera and your page opens in their browser — just like a website. No app, no account, no friction whatsoever.' },
  { q: 'I\'m a baker / artist, not a restaurant. Does this work for me?',
    a: 'Absolutely — Peshkash is built for any offline business. Bakers use it for ingredient lists and order links. Artists use it for portfolio pages and print sales. If you have customers who visit in person, Peshkash works for you.' },
  { q: 'Can I reuse the same QR plate forever?',
    a: 'Yes. You print once (from ₹49) and we update what the QR points to whenever you need. New menu, new season, new event — same plate, always current.' },
  { q: 'How quickly can I go live?',
    a: 'WhatsApp us your content and you\'re usually live in 24–48 hours. For urgent bookings, message us and we\'ll prioritise.' },
  { q: 'What insights do I actually get?',
    a: 'You see how many times your QR was scanned, when, and from which pages. Over time, this tells you which products get the most interest, which events drove the most traffic, and how your digital presence is growing.' },
  { q: 'Is there a long-term contract?',
    a: 'No subscription for Starter or Pro — you pay per session. The Business plan for high-volume vendors offers long-term agreements at discounted rates.' },
];

// ── Three.js ──────────────────────────────────────────────
let animId = 0;
let renderer: THREE.WebGLRenderer | null = null;

function initThree(canvas: HTMLCanvasElement) {
  const W = canvas.clientWidth || window.innerWidth;
  const H = canvas.clientHeight || window.innerHeight;

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  // Scene + Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 100);
  camera.position.set(0, 0, 4.5);

  // ── Particles ──────────────────────────────────────────
  const isMobile = window.innerWidth < 768;
  const COUNT = isMobile ? 1200 : 2800;

  const positions = new Float32Array(COUNT * 3);
  const colors    = new Float32Array(COUNT * 3);
  const sizes     = new Float32Array(COUNT);

  const amber  = new THREE.Color('#e07830');
  const amber2 = new THREE.Color('#f0a060');
  const white  = new THREE.Color('#ffffff');

  for (let i = 0; i < COUNT; i++) {
    // Spiral galaxy distribution
    const t     = Math.random();
    const arm   = Math.floor(Math.random() * 3);
    const angle = (arm * Math.PI * 2) / 3 + t * Math.PI * 4;
    const r     = 0.4 + t * 2.8 + Math.random() * 0.5;
    const spread = (1 - t) * 0.4;

    positions[i * 3]     = Math.cos(angle) * r + (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.6;
    positions[i * 3 + 2] = Math.sin(angle) * r + (Math.random() - 0.5) * spread;

    const rnd = Math.random();
    const col = rnd < 0.55 ? amber : rnd < 0.82 ? amber2 : white;
    colors[i * 3]     = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;

    sizes[i] = Math.random() < 0.05 ? 0.022 : 0.008 + Math.random() * 0.01;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.012,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const galaxy = new THREE.Points(geo, mat);
  scene.add(galaxy);

  // ── Glow rings ─────────────────────────────────────────
  function makeRing(radius: number, opacity: number) {
    const g = new THREE.TorusGeometry(radius, 0.006, 16, 128);
    const m = new THREE.MeshBasicMaterial({
      color: amber,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    return new THREE.Mesh(g, m);
  }

  const ring1 = makeRing(0.9, 0.35);
  const ring2 = makeRing(1.6, 0.18);
  const ring3 = makeRing(2.4, 0.08);
  ring2.rotation.x = Math.PI / 4;
  ring3.rotation.x = -Math.PI / 5;
  ring3.rotation.z = Math.PI / 6;
  scene.add(ring1, ring2, ring3);

  // ── Mouse tracking ─────────────────────────────────────
  const mouse = { x: 0, y: 0 };
  const cam   = { x: 0, y: 0 };

  function onMouseMove(e: MouseEvent) {
    mouse.x = (e.clientX / window.innerWidth  - 0.5) * 0.5;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 0.35;
  }
  window.addEventListener('mousemove', onMouseMove, { passive: true });

  // ── Resize ─────────────────────────────────────────────
  function onResize() {
    const W = window.innerWidth;
    const H = canvas.clientHeight || window.innerHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer!.setSize(W, H);
  }
  window.addEventListener('resize', onResize, { passive: true });

  // ── Animate ────────────────────────────────────────────
  let tick = 0;
  function animate() {
    animId = requestAnimationFrame(animate);
    tick++;
    const t = tick * 0.001;

    // Smooth camera parallax
    cam.x += (mouse.x - cam.x) * 0.04;
    cam.y += (-mouse.y - cam.y) * 0.04;
    camera.position.x = cam.x;
    camera.position.y = cam.y;
    camera.lookAt(0, 0, 0);

    // Slow galaxy rotation
    galaxy.rotation.y = t * 0.06;

    // Pulse rings
    ring1.rotation.z = t * 0.12;
    ring2.rotation.z = -t * 0.08;
    ring3.rotation.y = t * 0.05;
    (ring1.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(t * 1.8) * 0.1;

    renderer!.render(scene, camera);
  }
  animate();

  // cleanup factory
  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', onResize);
    geo.dispose();
    mat.dispose();
    renderer?.dispose();
  };
}

// ── lifecycle ──────────────────────────────────────────────
let cleanup: (() => void) | null = null;

onMounted(() => {
  // Three.js
  if (canvasRef.value) {
    try { cleanup = initThree(canvasRef.value); }
    catch (e) { console.warn('Three.js init failed, continuing without WebGL', e); }
  }

  // Scroll reveal
  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target as HTMLElement;
        const d = Number(el.style.getPropertyValue('--d').replace('ms', '') || 0);
        setTimeout(() => el.classList.add('in'), d);
        io.unobserve(el);
      }
    }),
    { threshold: 0.1 }
  );
  document.querySelectorAll<HTMLElement>('.rev').forEach(el => io.observe(el));

  // Back to top
  window.addEventListener('scroll', () => { showTop.value = window.scrollY > 500; }, { passive: true });
});

onBeforeUnmount(() => { cleanup?.(); });

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
</script>

<style scoped>
/* ─── TOKENS ───────────────────────────────────────────── */
.site {
  --ink:    #0a0908;
  --amber:  #e07830;
  --amber2: #f0a060;
  --cream:  #f5ede0;
  --paper:  #ece4d3;
  --forest: #0e2518;
  --w:      #ffffff;
  --m:      rgba(255,255,255,0.45);
  --md:     #7a6a50;
  font-family: 'Urbanist', sans-serif;
  background: var(--ink);
  overflow-x: hidden;
}

/* ─── REVEAL ───────────────────────────────────────────── */
.rev {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.rev.in { opacity: 1; transform: none; }

/* ─── SHARED LABELS ────────────────────────────────────── */
.s-label {
  display: block;
  font-size: 0.67rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 0.85rem;
}
.s-label-light { color: rgba(255,255,255,0.3); display:block; font-size:0.67rem; font-weight:900; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:0.85rem; }
.s-label-dark  { color: rgba(0,0,0,0.35); display:block; font-size:0.67rem; font-weight:900; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:0.85rem; }
.text-amber { color: var(--amber); }

/* ═══════════════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════════════ */
.hero {
  position: relative;
  min-height: 100vh;
  background: var(--ink);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr auto;
  padding: 0 max(1.5rem, 5vw);
  overflow: hidden;
}
@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; }
}

/* Three.js canvas */
.hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

/* content layers above canvas */
.hero-content,
.hero-right,
.hero-scroll-hint { position: relative; z-index: 1; }

.hero-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 7rem 2rem 3rem 0;
}
@media (max-width: 900px) { .hero-content { padding: 6rem 0 2rem; } }

.hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 1.75rem;
}
.h-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--amber);
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(1.4)} }

.hero-h1 {
  font-family: 'Rufina', serif;
  font-size: clamp(2.8rem, 7vw, 5.6rem);
  font-weight: 700;
  line-height: 1.02;
  color: var(--w);
  margin-bottom: 1.5rem;
  letter-spacing: -0.03em;
}
.h-em {
  display: block;
  color: transparent;
  -webkit-text-stroke: 2px var(--amber);
  font-style: italic;
}

.hero-p {
  font-size: 1rem;
  color: var(--m);
  line-height: 1.8;
  max-width: 450px;
  margin-bottom: 2.25rem;
}

.hero-btns { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 3rem; }

.cta-wa {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #25d366;
  color: #fff;
  font-weight: 800;
  font-size: 0.95rem;
  padding: 0.85rem 1.8rem;
  border-radius: 100px;
  text-decoration: none;
  transition: all 0.22s;
}
.cta-wa:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(37,211,102,0.45); color:#fff; }
.cta-wa i { font-size: 1.15rem; }
.cta-down {
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(255,255,255,0.35);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s;
}
.cta-down:hover { color: var(--amber); }

/* stat strip */
.hero-strip {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 1.25rem 0;
  border-top: 1px solid rgba(255,255,255,0.07);
  grid-column: 1 / -1;
}
.h-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.h-stat b {
  font-family: 'Rufina', serif;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 700;
  color: var(--amber);
  line-height: 1;
}
.h-stat span { font-size: 0.68rem; color: rgba(255,255,255,0.28); font-weight: 600; }
.h-sep { width: 1px; height: 36px; background: rgba(255,255,255,0.07); flex-shrink: 0; }

/* hero right — scan scene */
.hero-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5rem 0;
}
@media (max-width: 900px) { .hero-right { display: none; } }

.scan-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.ss-qr {
  background: #fff;
  border-radius: 18px;
  padding: 1rem;
  width: 160px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.55);
  position: relative;
}
.ss-qr-img { width: 100%; display: block; border-radius: 8px; }
.ss-live {
  position: absolute;
  bottom: -11px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--amber);
  color: var(--ink);
  font-size: 0.63rem;
  font-weight: 900;
  padding: 0.2rem 0.75rem;
  border-radius: 100px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
}
.live-pulse {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--ink);
  animation: pulse 1.5s infinite;
}

.ss-beam { color: var(--amber); }

.ss-phone { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.ss-phone-shell {
  width: 155px;
  height: 295px;
  background: #1c1c1c;
  border-radius: 28px;
  border: 8px solid #2a2a2a;
  overflow: hidden;
  position: relative;
  box-shadow: 0 24px 60px rgba(0,0,0,0.6);
}
.ss-notch {
  position: absolute;
  top: 8px; left: 50%; transform: translateX(-50%);
  width: 44px; height: 12px;
  background: #111;
  border-radius: 0 0 8px 8px;
  z-index: 2;
}
.ss-screen {
  width: 100%; height: 65%;
  object-fit: cover;
  object-position: top;
}
.ss-insights {
  background: #f8f3ea;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ss-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.6rem;
  font-weight: 700;
  color: #3a2a10;
}
.ss-row i { color: var(--amber); font-size: 0.7rem; }

/* floating chips around the visual */
.f-chip {
  position: absolute;
  background: rgba(255,255,255,0.07);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.35rem 0.8rem;
  border-radius: 100px;
  display: flex;
  align-items: center;
  gap: 5px;
  pointer-events: none;
}
.f-chip i { color: var(--amber); }
.fc-1 { top: 18%; right: 2%; }
.fc-2 { top: 36%; left: 3%; }
.fc-3 { bottom: 28%; right: 4%; }
.fc-4 { bottom: 14%; left: 5%; }

/* scroll hint */
.hero-scroll-hint {
  position: absolute;
  bottom: 6rem;
  left: max(1.5rem, 5vw);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: rgba(255,255,255,0.25);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.scroll-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, rgba(224,120,48,0.6), transparent);
  animation: line-drop 2s ease-in-out infinite;
}
@keyframes line-drop { 0%,100%{transform:scaleY(1);opacity:1} 50%{transform:scaleY(0.5);opacity:0.4} }

/* ═══════════════════════════════════════════════════════
   TICKER
═══════════════════════════════════════════════════════ */
.ticker { background: var(--amber); overflow: hidden; padding: 10px 0; }
.ticker-track {
  display: inline-flex;
  gap: 2.5rem;
  white-space: nowrap;
  animation: scroll-left 32s linear infinite;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink);
}
.ticker-track em { opacity: 0.3; font-style: normal; }
@keyframes scroll-left {
  from { transform: translateX(0); }
  to   { transform: translateX(-20%); }
}

/* ═══════════════════════════════════════════════════════
   STATEMENT
═══════════════════════════════════════════════════════ */
.statement {
  background: var(--cream);
  padding: 7rem max(1.5rem, 5vw);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5rem;
  align-items: center;
}
@media (max-width: 860px) { .statement { grid-template-columns: 1fr; gap: 3rem; } }

.s-h2 {
  font-family: 'Rufina', serif;
  font-size: clamp(2.6rem, 6vw, 5rem);
  font-weight: 700;
  line-height: 1.0;
  color: var(--ink);
  letter-spacing: -0.04em;
  margin-bottom: 1.5rem;
}
.s-h2 em { font-style: italic; color: var(--amber); }
.s-body {
  font-size: 1rem;
  color: var(--md);
  line-height: 1.78;
  max-width: 480px;
}

.s-img-wrap { position: relative; border-radius: 16px; overflow: visible; }
.s-img {
  width: 100%;
  border-radius: 16px;
  display: block;
  box-shadow: 0 24px 60px rgba(0,0,0,0.18);
}
.s-img-float {
  position: absolute;
  background: var(--ink);
  color: rgba(255,255,255,0.85);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.s-img-float i { color: var(--amber); }
.s-if-a { top: -12px; left: 20px; }
.s-if-b { bottom: 16px; right: -12px; }

/* ═══════════════════════════════════════════════════════
   FOR ALL
═══════════════════════════════════════════════════════ */
.forall {
  background: var(--ink);
  padding: 7rem max(1.5rem, 5vw);
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 4rem;
  align-items: start;
}
@media (max-width: 768px) { .forall { grid-template-columns: 1fr; gap: 2.5rem; } }

.forall-h2 {
  font-family: 'Rufina', serif;
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 700;
  color: var(--w);
  line-height: 1.05;
  letter-spacing: -0.03em;
  position: sticky;
  top: 5rem;
}
.forall-h2 em { font-style: italic; color: var(--amber); }

.forall-list { display: flex; flex-direction: column; }
.fl-item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4em;
  padding: 1.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: clamp(1rem, 2vw, 1.35rem);
  line-height: 1.5;
}
.fl-item:first-child { border-top: 1px solid rgba(255,255,255,0.06); }
.fl-for { font-family: 'Rufina', serif; font-style: italic; color: rgba(255,255,255,0.25); }
.fl-who { font-family: 'Rufina', serif; font-weight: 700; color: var(--amber); font-size: 1.15em; }
.fl-rest { color: rgba(255,255,255,0.5); font-size: 0.82em; }

/* ═══════════════════════════════════════════════════════
   PRODUCTS — alternating rows
═══════════════════════════════════════════════════════ */
.products { display: flex; flex-direction: column; }

.prod-row {
  display: grid;
  grid-template-columns: 72px 1fr 1.1fr;
  gap: 3rem;
  padding: 6rem max(1.5rem, 5vw);
  align-items: center;
}
@media (max-width: 860px) {
  .prod-row { grid-template-columns: 1fr; gap: 2rem; padding: 4rem max(1.5rem, 5vw); }
}
.prod-dark  { background: var(--ink); }
.prod-cream { background: var(--cream); }

.prod-n {
  font-family: 'Rufina', serif;
  font-size: clamp(5rem, 9vw, 8rem);
  font-weight: 700;
  color: rgba(255,255,255,0.05);
  line-height: 1;
  user-select: none;
  align-self: start;
  padding-top: 0.15em;
}
.prod-n-cream { color: rgba(0,0,0,0.05); }
@media (max-width: 860px) { .prod-n { display: none; } }

.prod-h3 {
  font-family: 'Rufina', serif;
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  font-weight: 700;
  color: var(--w);
  line-height: 1.12;
  letter-spacing: -0.02em;
  margin-bottom: 1.25rem;
}
.prod-h3-dark { color: var(--ink); }
.prod-p {
  font-size: 0.95rem;
  color: var(--m);
  line-height: 1.78;
  margin-bottom: 1.5rem;
  max-width: 400px;
}
.prod-p-dark { color: var(--md); }
.prod-list, .prod-list-dark {
  list-style: none;
  padding: 0; margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.prod-list li { display:flex; align-items:flex-start; gap:8px; font-size:0.87rem; color:var(--m); }
.prod-list-dark li { display:flex; align-items:flex-start; gap:8px; font-size:0.87rem; color:var(--md); }
.prod-list li i, .prod-list-dark li i { color:var(--amber); flex-shrink:0; margin-top:2px; }

.prod-visual { border-radius: 16px; overflow: hidden; }
.prod-visual-flip { order: -1; }
@media (max-width: 860px) { .prod-visual-flip { order: 0; } }
.prod-img {
  width: 100%;
  display: block;
  border-radius: 16px;
  box-shadow: 0 20px 55px rgba(0,0,0,0.4);
  transition: transform 0.4s ease;
}
.prod-img:hover { transform: scale(1.02); }

.prod-qr-visual { display:flex; flex-direction:column; align-items:center; }
.qr-plate-mock { display:flex; flex-direction:column; align-items:center; gap:1rem; }
.qr-plate-img {
  max-width: 240px;
  width: 100%;
  background: #fff;
  padding: 14px;
  border-radius: 18px;
  box-shadow: 0 20px 55px rgba(0,0,0,0.4);
}
.qr-plate-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* ═══════════════════════════════════════════════════════
   HOW
═══════════════════════════════════════════════════════ */
.how {
  background: var(--cream);
  padding: 7rem max(1.5rem, 5vw);
}
.how-inner { max-width: 1200px; margin: 0 auto; }
.how-head { margin-bottom: 4rem; }
.how-h2 {
  font-family: 'Rufina', serif;
  font-size: clamp(2rem, 4.5vw, 3.4rem);
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.how-steps {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}
.how-step {
  flex: 1;
  min-width: 220px;
  background: #fff;
  border-radius: 18px;
  padding: 2rem;
  border: 1px solid var(--paper);
  transition: transform 0.22s, box-shadow 0.22s;
}
.how-step:hover { transform: translateY(-4px); box-shadow: 0 14px 36px rgba(0,0,0,0.08); }
.step-n {
  font-family: 'Rufina', serif;
  font-size: 3.2rem;
  font-weight: 700;
  color: var(--amber);
  opacity: 0.4;
  line-height: 1;
  margin-bottom: 1rem;
}
.how-step h4 { font-size: 1.02rem; font-weight: 800; color: var(--ink); margin-bottom: 0.5rem; }
.how-step p { font-size: 0.87rem; color: var(--md); line-height: 1.68; margin: 0; }
.how-arrow {
  color: rgba(0,0,0,0.15);
  padding-top: 2.75rem;
  flex-shrink: 0;
}
@media (max-width: 700px) { .how-arrow { display: none; } }

/* ═══════════════════════════════════════════════════════
   NUMBERS
═══════════════════════════════════════════════════════ */
.numbar {
  background: var(--forest);
  border-top: 1px solid rgba(224,120,48,0.18);
  border-bottom: 1px solid rgba(224,120,48,0.18);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 2.5rem max(1.5rem, 5vw);
}
.n-item {
  flex: 1;
  min-width: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
  padding: 0.5rem;
}
.n-item b {
  font-family: 'Rufina', serif;
  font-size: clamp(1.8rem, 4vw, 3rem);
  font-weight: 700;
  color: var(--amber);
  line-height: 1;
}
.n-item span { font-size: 0.68rem; color: rgba(255,255,255,0.3); font-weight: 600; letter-spacing: 0.04em; }
.n-sep { width:1px; height:44px; background:rgba(255,255,255,0.07); flex-shrink:0; }
@media (max-width: 580px) { .n-sep { display:none; } .n-item { min-width: calc(50% - 1rem); } }

/* ═══════════════════════════════════════════════════════
   PRICING
═══════════════════════════════════════════════════════ */
.pricing {
  background: var(--cream);
  padding: 7rem max(1.5rem, 5vw);
}
.pricing-head { margin-bottom: 3rem; }
.pricing-h2 {
  font-family: 'Rufina', serif;
  font-size: clamp(2rem, 4.5vw, 3.4rem);
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin-bottom: 0.5rem;
}
.pricing-sub { font-size: 0.9rem; color: var(--md); }

.plans {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 2rem;
}
@media (max-width: 860px) { .plans { grid-template-columns: 1fr; } }

.plan {
  background: #fff;
  border: 1.5px solid var(--paper);
  border-radius: 20px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform 0.22s, box-shadow 0.22s;
}
.plan:hover { transform: translateY(-4px); box-shadow: 0 16px 42px rgba(0,0,0,0.09); }
.plan-pro {
  background: var(--ink);
  border-color: rgba(224,120,48,0.28);
  box-shadow: 0 8px 32px rgba(0,0,0,0.14);
}
.plan-badge {
  position: absolute;
  top: -12px; left: 50%; transform: translateX(-50%);
  background: var(--amber);
  color: var(--ink);
  font-size: 0.61rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.2rem 1rem;
  border-radius: 100px;
  white-space: nowrap;
}
.plan-name { font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: var(--md); margin-bottom: 0.75rem; display: block; }
.plan-pro .plan-name { color: var(--amber); }
.plan-price {
  font-family: 'Rufina', serif;
  font-size: 0.88rem;
  color: var(--md);
  display: flex;
  align-items: flex-start;
  gap: 2px;
  margin-bottom: 0.2rem;
}
.plan-price sup { font-size: 0.6em; margin-top: 0.4em; color: var(--amber); }
.plan-price b { font-size: 3.2rem; font-weight: 700; color: var(--ink); line-height: 1; }
.plan-pro .plan-price b { color: var(--amber); }
.plan-price-custom {
  font-family: 'Rufina', serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1;
  margin-bottom: 0.2rem;
}
.plan-when { font-size: 0.73rem; color: var(--md); margin-bottom: 1.5rem; display: block; }
.plan-pro .plan-when { color: rgba(255,255,255,0.3); }
.plan-list {
  list-style: none;
  padding: 0; margin: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-bottom: 1.75rem;
}
.plan-list li { display:flex; align-items:flex-start; gap:8px; font-size:0.87rem; color:#4b3f2e; }
.plan-pro .plan-list li { color:rgba(255,255,255,0.6); }
.plan-list li i { color:var(--amber); flex-shrink:0; margin-top:2px; }
.plan-btn {
  display: block;
  text-align: center;
  font-weight: 800;
  font-size: 0.88rem;
  padding: 0.85rem;
  border-radius: 100px;
  text-decoration: none;
  transition: all 0.2s;
}
.outline { border: 1.5px solid var(--paper); color: var(--ink); }
.outline:hover { border-color: var(--amber); color: var(--amber); }
.fill { background: linear-gradient(135deg, var(--amber), var(--amber2)); color: var(--ink); }
.fill:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(224,120,48,0.4); color: var(--ink); }

.plate-strip {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.75rem;
  border: 1.5px dashed rgba(224,120,48,0.35);
  border-radius: 14px;
  flex-wrap: wrap;
}
.plate-strip > i { color: var(--amber); font-size: 1.4rem; flex-shrink: 0; }
.plate-strip div { flex: 1; min-width: 180px; }
.plate-strip strong { display: block; color: var(--ink); font-size: 0.95rem; font-weight: 700; }
.plate-strip span { font-size: 0.82rem; color: var(--md); }
.plate-strip a { font-size: 0.85rem; font-weight: 700; color: var(--amber); text-decoration: none; white-space: nowrap; }
.plate-strip a:hover { text-decoration: underline; }

/* ═══════════════════════════════════════════════════════
   FAQ
═══════════════════════════════════════════════════════ */
.faq {
  background: var(--ink);
  padding: 7rem max(1.5rem, 5vw);
}
.faq-h2 {
  font-family: 'Rufina', serif;
  font-size: clamp(2rem, 4.5vw, 3.4rem);
  font-weight: 700;
  color: var(--w);
  letter-spacing: -0.02em;
  margin-bottom: 3rem;
}
.faq-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 4rem;
}
@media (max-width: 768px) { .faq-grid { grid-template-columns: 1fr; } }
.faq-item {
  padding: 1.25rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  cursor: pointer;
  user-select: none;
}
.faq-item:first-child, .faq-item:nth-child(4) { border-top: 1px solid rgba(255,255,255,0.07); }
@media (max-width: 768px) { .faq-item:nth-child(4) { border-top: none; } }
.faq-q {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-size: 0.93rem;
  font-weight: 700;
  color: rgba(255,255,255,0.62);
  transition: color 0.2s;
}
.faq-q i { flex-shrink: 0; color: var(--amber); font-size: 0.82rem; }
.faq-item:hover .faq-q, .faq-item.open .faq-q { color: var(--w); }
.faq-a { font-size: 0.87rem; color: rgba(255,255,255,0.38); line-height: 1.75; margin-top: 0.75rem; margin-bottom: 0; }

/* ═══════════════════════════════════════════════════════
   CONTACT
═══════════════════════════════════════════════════════ */
.contact {
  background: var(--forest);
  background-image: radial-gradient(ellipse at top right, rgba(224,120,48,0.1) 0%, transparent 55%);
  padding: 7rem max(1.5rem, 5vw);
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 5rem;
  align-items: start;
}
@media (max-width: 860px) { .contact { grid-template-columns: 1fr; gap: 3rem; } }

.contact-h2 {
  font-family: 'Rufina', serif;
  font-size: clamp(2.2rem, 4.5vw, 3.4rem);
  font-weight: 700;
  color: var(--w);
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
}
.contact-h2 em { font-style: italic; color: var(--amber); }
.contact-sub { font-size: 0.95rem; color: rgba(255,255,255,0.38); line-height: 1.65; margin-bottom: 2.5rem; max-width: 340px; }

.wa-big {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #25d366;
  color: #fff;
  border-radius: 14px;
  padding: 1rem 1.5rem;
  text-decoration: none;
  transition: all 0.22s;
  margin-bottom: 1.5rem;
  width: fit-content;
}
.wa-big:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(37,211,102,0.4); color: #fff; }
.wa-big i { font-size: 1.75rem; }
.wa-big strong { display: block; font-size: 1rem; font-weight: 800; }
.wa-big small { font-size: 0.74rem; opacity: 0.8; }
.contact-links { display: flex; flex-direction: column; gap: 0.6rem; }
.contact-links a { display:inline-flex; align-items:center; gap:8px; color:rgba(255,255,255,0.35); font-size:0.87rem; text-decoration:none; transition:color 0.2s; }
.contact-links a:hover { color: var(--amber); }
.contact-links a i { color: var(--amber); }

.contact-form {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 2.5rem;
}
.contact-form h4 { font-family:'Rufina',serif; font-size:1.4rem; font-weight:700; color:var(--w); margin-bottom:1.5rem; }
.f-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
@media (max-width:540px) { .f-row { grid-template-columns:1fr; } }
.contact-form label { display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1rem; }
.contact-form label span { font-size:0.65rem; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:rgba(255,255,255,0.28); }
.contact-form input,
.contact-form select,
.contact-form textarea {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 0.7rem 0.9rem;
  color: var(--w);
  font-size: 0.88rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
}
.contact-form input::placeholder, .contact-form textarea::placeholder { color:rgba(255,255,255,0.18); }
.contact-form input:focus, .contact-form select:focus, .contact-form textarea:focus { border-color:var(--amber); }
.contact-form select option { background: var(--forest); }
.contact-form button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--amber), var(--amber2));
  color: var(--ink);
  font-weight: 800;
  font-size: 0.95rem;
  padding: 0.9rem;
  border: none;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.22s;
  margin-top: 0.5rem;
  font-family: inherit;
}
.contact-form button:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(224,120,48,0.4); }

/* ═══════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════ */
.footer {
  background: #060504;
  border-top: 1px solid rgba(255,255,255,0.04);
  padding: 3rem max(1.5rem, 5vw) 0;
}
.footer-inner {
  display: flex;
  gap: 4rem;
  flex-wrap: wrap;
  padding-bottom: 2.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  max-width: 1200px;
  margin: 0 auto;
}
.footer-brand { flex: 1; min-width: 200px; }
.fb-name { display:flex; align-items:center; gap:8px; margin-bottom:0.5rem; }
.fb-name i { font-size:1.3rem; color:var(--amber); }
.fb-name span { font-family:'Dancing Script',cursive; font-size:1.55rem; color:var(--w); }
.footer-brand > p { font-size:0.82rem; color:rgba(255,255,255,0.28); line-height:1.6; max-width:240px; margin:0 0 0.75rem; }
.fb-social { display:flex; gap:9px; }
.fb-social a { width:36px; height:36px; border-radius:9px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.38); text-decoration:none; font-size:0.93rem; transition:all 0.2s; }
.fb-social a:hover { background:var(--amber); color:var(--ink); border-color:var(--amber); }
.footer-nav { display:flex; gap:4rem; flex-wrap:wrap; }
.fn-col { display:flex; flex-direction:column; gap:0.55rem; }
.fn-col h6 { font-size:0.62rem; font-weight:900; text-transform:uppercase; letter-spacing:0.15em; color:var(--amber); margin-bottom:0.2rem; }
.fn-col a { font-size:0.84rem; color:rgba(255,255,255,0.3); text-decoration:none; transition:color 0.2s; }
.fn-col a:hover { color:var(--amber); }
.footer-bottom { display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; padding:1.25rem 0; font-size:0.74rem; color:rgba(255,255,255,0.14); max-width:1200px; margin:0 auto; }

/* ═══════════════════════════════════════════════════════
   FLOATING BUTTONS
═══════════════════════════════════════════════════════ */
.float-wa {
  position: fixed; bottom: 5rem; right: 1.25rem;
  width: 50px; height: 50px; border-radius: 50%;
  background: #25d366; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.45rem; text-decoration: none;
  box-shadow: 0 4px 20px rgba(37,211,102,0.4);
  z-index: 980; transition: transform 0.2s;
  animation: pop-in 0.4s 1.5s both;
}
.float-wa:hover { transform: scale(1.1); color: #fff; }
@keyframes pop-in { from{opacity:0;transform:scale(0.3)} to{opacity:1;transform:scale(1)} }
.float-top {
  position: fixed; bottom: 1.25rem; right: 1.25rem;
  width: 38px; height: 38px; border-radius: 10px;
  background: rgba(255,255,255,0.07);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--w); display:flex; align-items:center; justify-content:center;
  cursor: pointer; z-index: 979; font-size: 0.93rem; transition: all 0.2s;
}
.float-top:hover { background: var(--amber); border-color: var(--amber); }

:global(html) { scroll-behavior: smooth; }
</style>
