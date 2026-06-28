<template>
  <div class="site">

    <!-- THREE.JS NETWORK — fixed, full viewport, z:0 -->
    <canvas ref="cvs" class="net-canvas" aria-hidden="true"></canvas>

    <div class="page">
      <Navbar />

      <!-- ═══════ HERO ═══════════════════════════════════════ -->
      <section class="hero" id="hero">
        <div class="hero-content">
          <p class="kicker scene-in" style="--d:0s">
            <span class="kdot"></span> The QR revolution · For every offline business
          </p>

          <h1 class="h1 scene-in" style="--d:.1s">
            Offline. Unseen.<br><em>Not anymore.</em>
          </h1>

          <p class="hero-p scene-in" style="--d:.35s">
            Every customer who walks past you is a lead you're losing. One QR turns
            every single scan into a customer you keep — no website, no app, just a scan.
          </p>

          <div class="hero-actions scene-in" style="--d:.5s">
            <a href="https://wa.me/+919115551110" target="_blank" rel="noopener"
               class="cta-wa" @mouseenter="onCtaHover" @mouseleave="onCtaLeave">
              <i class="bi bi-whatsapp"></i> Chat on WhatsApp
            </a>
            <a href="#picker" class="cta-soft">See it in action ↓</a>
          </div>

          <div class="biz-tags scene-in" style="--d:.65s">
            <span v-for="t in bizTags" :key="t.label"
                  class="btag"
                  @mouseenter="setHoverColor(t.label)"
                  @mouseleave="clearHoverColor"><i class="bi" :class="t.icon"></i> {{ t.label }}</span>
          </div>
        </div>

        <!-- QR scan demo — 3D perspective, with its own parallax layer -->
        <div class="hero-demo scene-in dir-r" style="--d:.3s" aria-hidden="true">
          <div class="hero-demo-inner" ref="heroDemoInnerRef">
            <div class="demo-wrap" @click="scanned = !scanned">
              <div class="demo-qr-card" :class="{ scanned }">
                <img :src="qrImg" alt="" class="demo-qr-img" />
                <span class="demo-scan-label">{{ scanned ? 'tap to reset' : 'tap to scan ✦' }}</span>
              </div>
              <div class="demo-connector" :class="{ show: scanned }"></div>
              <Transition name="phone-reveal">
                <div v-if="scanned" class="demo-phone">
                  <div class="dph-shell">
                    <div class="dph-notch"></div>
                    <img :src="menuImg" alt="" class="dph-screen" />
                    <div class="dph-insights">
                      <div><i class="bi bi-eye-fill"></i> <span class="count-num" data-to="47">0</span> scans</div>
                      <div><i class="bi bi-graph-up-arrow"></i> <span class="count-num" data-to="23">0</span>% growth</div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>

      </section>

      <!-- ═══════ FOMO / MARKETING PUNCH ═══════════════════════ -->
      <section class="section fomo-sec" id="fomo">
        <div class="fomo-intro">
          <p class="lbl scene-in dir-d" style="--d:0s">The math nobody tells you</p>
          <h2 class="h2 fomo-h2 scene-in dir-d" style="--d:.06s">
            Every customer who doesn't scan<br>is a lead you'll <em>never see again.</em>
          </h2>
          <p class="fomo-sub scene-in dir-d" style="--d:.12s">
            The world went digital years ago. AI is rewriting how people discover
            businesses overnight. If you're not scannable, you're invisible —
            and someone else just got the sale.
          </p>
        </div>

        <div class="fomo-grid">
          <div class="fomo-card scene-in dir-l" style="--d:.05s">
            <span class="fomo-num">1 Scan</span>
            <span class="fomo-eq">=</span>
            <span class="fomo-result">1 Lead</span>
          </div>
          <div class="fomo-card scene-in dir-d" style="--d:.12s">
            <span class="fomo-num">1 Lead</span>
            <span class="fomo-eq">=</span>
            <span class="fomo-result">1 Customer You Didn't Have</span>
          </div>
          <div class="fomo-card scene-in dir-r" style="--d:.19s">
            <span class="fomo-num">1 Missed Scan</span>
            <span class="fomo-eq">=</span>
            <span class="fomo-result">Revenue You'll Never Know You Lost</span>
          </div>
        </div>

        <p class="fomo-tagline scene-in dir-d" style="--d:.25s">
          Not every business needs a complete website. <em>Sometimes, a simple QR code is enough.</em>
        </p>
        <p class="fomo-tagline2 scene-in dir-d" style="--d:.3s">
          No coder. No designer. No excuse.
        </p>
      </section>

      <!-- ═══════ BUSINESS PICKER ════════════════════════════ -->
      <section class="section" id="picker">
        <div class="text-scrim scene-in dir-l" style="--d:0s">
          <p class="lbl">A few examples</p>
          <h2 class="h2">However you sell it<br>— it works.</h2>
          <p class="sec-sub">These are just examples. Furniture, wine, flowers, repairs, tuition,
            jewellery, anything — if customers come to you, this is for you too.</p>
        </div>

        <!-- Pills as network nodes -->
        <div class="node-pills scene-in dir-d" style="--d:.1s">
          <button
            v-for="b in businesses" :key="b.id"
            class="node-pill"
            :class="{ active: activeBiz === b.id }"
            @click="activeBiz = b.id; setParticleAccent(b.color)"
            @mouseenter="pulseNode(b.id)"
          >
            <span class="np-glow"></span>
            <i class="bi np-icon" :class="b.icon"></i>
            <span class="np-label">{{ b.label }}</span>
          </button>
        </div>

        <Transition name="biz-reveal" mode="out-in">
          <div v-if="currentBiz" :key="currentBiz.id" class="biz-content">
            <div class="biz-left">
              <i class="bi biz-big-emoji" :class="currentBiz.icon"></i>
              <h3 class="biz-h3">{{ currentBiz.headline }}</h3>
              <p class="biz-p">{{ currentBiz.copy }}</p>
              <a :href="`https://wa.me/+919115551110?text=${encodeURIComponent(currentBiz.id === 'other' ? 'Hi! I want to learn how Peshkash can work for my business.' : 'Hi! I run a ' + currentBiz.label + ' and want to learn about Peshkash.')}`"
                target="_blank" rel="noopener" class="biz-cta">
                <i class="bi bi-whatsapp"></i> {{ currentBiz.id === 'other' ? 'Tell us what you sell' : `Start as a ${currentBiz.label}` }}
              </a>
            </div>
            <ul class="biz-features">
              <li v-for="f in currentBiz.features" :key="f" class="biz-feat">
                <i class="bi bi-arrow-right-circle-fill"></i>{{ f }}
              </li>
            </ul>
          </div>
          <p v-else class="biz-hint"><i class="bi bi-arrow-up-circle"></i> Pick your type above</p>
        </Transition>
      </section>

      <!-- ═══════ HOW IT WORKS ════════════════════════════════ -->
      <section class="section" id="how">
        <div class="text-scrim how-intro scene-in dir-l" style="--d:0s">
          <p class="lbl">How it works</p>
          <h2 class="h2">Three steps. That's it.</h2>
        </div>
        <div class="steps-track">
          <div v-for="(s, i) in steps" :key="i"
               class="step-node scene-in"
               :class="dirClass(i)"
               :style="`--d:${.1 + i*.12}s`"
               @mousemove="tilt($event, i)"
               @mouseleave="untilt(i)"
               :ref="el => stepRefs[i] = el as HTMLElement">
            <div class="sn-num">{{ String(i+1).padStart(2,'0') }}</div>
            <i class="bi sn-icon" :class="s.icon"></i>
            <h4 class="sn-title">{{ s.title }}</h4>
            <p class="sn-body">{{ s.body }}</p>
            <div class="sn-glow"></div>
          </div>
        </div>
      </section>

      <!-- ═══════ DEMO ════════════════════════════════════════ -->
      <section class="section demo-section" id="demo">
        <div class="demo-img-wrap scene-in dir-l" style="--d:0s">
          <div class="demo-img-inner" ref="demoImgInnerRef">
            <img :src="placedImg" alt="QR in real life" class="demo-big-img" />
            <div class="demo-overlay-tag dot-a"><i class="bi bi-qr-code-scan"></i> Scan</div>
            <div class="demo-overlay-tag dot-b"><i class="bi bi-graph-up-arrow"></i> Insight</div>
            <div class="demo-overlay-tag dot-c"><i class="bi bi-share-fill"></i> Share</div>
          </div>
        </div>
        <div class="demo-text scene-in dir-r" style="--d:.12s">
          <p class="lbl">The experience</p>
          <h2 class="h2">What your customers<br>actually see.</h2>
          <p class="demo-p">Fast, beautiful, your brand — on any phone in under 2 seconds. No app. No login. Every scan becomes a lead in your hands, not lost in the wind.</p>
          <ul class="demo-checks">
            <li v-for="c in demoChecks" :key="c"><i class="bi bi-check2-circle"></i>{{ c }}</li>
          </ul>
          <p class="demo-tag">Your shop window just became the internet.</p>
        </div>
      </section>

      <!-- ═══════ FAQ ══════════════════════════════════════════ -->
      <section class="section faq-sec" id="faq">
        <div class="faq-head scene-in dir-l" style="--d:0s">
          <p class="lbl">FAQ</p>
          <h2 class="h2">Questions?<br><em>Answered.</em></h2>
          <a href="https://wa.me/+919115551110" target="_blank" rel="noopener" class="wa-sm">
            <i class="bi bi-whatsapp"></i> Ask us directly
          </a>
        </div>
        <div class="faq-body">
          <!-- Outer wrapper owns the one-shot scroll-reveal class only — nothing
               reactive touches it, so the IntersectionObserver's imperative
               classList.add('in') is never wiped out by a Vue re-render.
               The inner div owns the click/open toggle, which IS reactive. -->
          <div v-for="(q,i) in faqs" :key="i" class="faq-item-wrap scene-in dir-r" :style="`--d:${i*.04}s`">
            <div class="faq-item" :class="{ open: openFaq === i }" @click="openFaq = openFaq===i ? -1 : i">
              <div class="faq-q">
                <span>{{ q.q }}</span>
                <div class="faq-ic" :class="{ r: openFaq===i }">+</div>
              </div>
              <div class="faq-ans" :style="openFaq===i ? 'max-height:300px;opacity:1' : 'max-height:0;opacity:0'">
                <p>{{ q.a }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════ CONTACT ══════════════════════════════════════ -->
      <section class="section contact-sec" id="contact">
        <div class="ct-left scene-in dir-l" style="--d:0s">
          <p class="lbl">Let's talk</p>
          <h2 class="h2 ct-h2">Your offline business<br>deserves<br><em>the power of technology.</em></h2>
          <p class="ct-p">No pricing tables. Tell us about your business — we'll design the perfect setup.</p>
          <p class="ct-campaign">A QR is the cheapest marketing you'll ever buy.</p>
          <a href="https://wa.me/+919115551110" target="_blank" rel="noopener" class="wa-big">
            <div class="wab-icon"><i class="bi bi-whatsapp"></i></div>
            <div><strong>Chat on WhatsApp</strong><small>Usually replies within an hour</small></div>
          </a>
          <div class="ct-links">
            <a href="tel:+919115551110"><i class="bi bi-telephone-fill"></i> +91-9115551110</a>
            <a href="mailto:contact@peshkash.app"><i class="bi bi-envelope-fill"></i> contact@peshkash.app</a>
          </div>
        </div>

        <div class="ct-right scene-in dir-r" style="--d:.12s">
          <h4>Send a message</h4>
          <form action="mailto:contact@peshkash.app" method="post" enctype="text/plain">
            <div class="f2">
              <label><span>Name</span><input name="name" type="text" placeholder="Your name" required /></label>
              <label><span>Phone</span><input name="phone" type="tel" placeholder="+91 90000 00000" /></label>
            </div>
            <label><span>Email</span><input name="email" type="email" placeholder="you@example.com" required /></label>
            <label><span>I run a…</span>
              <select name="type">
                <option value="">Select</option>
                <option>Food / Bakery / Restaurant</option>
                <option>Art / Gallery / Studio</option>
                <option>Fashion / Furniture / Retail</option>
                <option>Wine & Spirits</option>
                <option>Catering / Hotel / Venue</option>
                <option>Exhibition / Market Stall</option>
                <option>Services (repairs, tuition, fitness…)</option>
                <option>Something else entirely</option>
              </select>
            </label>
            <label><span>Message</span>
              <textarea name="message" rows="3" placeholder="Tell us about your business…"></textarea>
            </label>
            <button type="submit"><i class="bi bi-send-fill"></i> Send Message</button>
          </form>
        </div>
      </section>

      <!-- ═══════ FOOTER ══════════════════════════════════════ -->
      <footer class="footer">
        <div class="ft-inner">
          <div class="fb">
            <div class="fb-brand"><i class="bi bi-qr-code-scan"></i><span>Peshkash</span></div>
            <p>Digital insights from offline experiences.</p>
            <div class="fb-social">
              <a href="https://wa.me/+919115551110" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i></a>
              <a href="https://instagram.com/peshkash.app" target="_blank" rel="noopener"><i class="bi bi-instagram"></i></a>
              <a href="mailto:contact@peshkash.app"><i class="bi bi-envelope"></i></a>
            </div>
          </div>
          <nav class="ft-nav">
            <div class="fnc"><h6>Product</h6>
              <a href="/#how">How It Works</a>
              <a href="/#picker">For My Business</a>
              <a href="/#faq">FAQ</a>
            </div>
            <div class="fnc"><h6>Contact</h6>
              <a href="https://wa.me/+919115551110" target="_blank" rel="noopener">WhatsApp</a>
              <a href="tel:+919115551110">+91-9115551110</a>
            </div>
          </nav>
        </div>
        <div class="ft-bottom">
          <span>© {{ new Date().getFullYear() }} Peshkash</span>
          <span>Offline India, going digital</span>
        </div>
      </footer>
    </div><!-- /page -->

    <a href="https://wa.me/+919115551110" target="_blank" rel="noopener" class="fwa"><i class="bi bi-whatsapp"></i></a>
    <button v-show="topVisible" @click="scrollTop" class="fup"><i class="bi bi-arrow-up"></i></button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, reactive } from 'vue';
import Navbar from '../components/Navbar.vue';
import * as THREE from 'three';
import qrImg     from '../assets/peshkashqrhero.png';
import menuImg   from '../assets/peshkash-demo-section.png';
import placedImg from '../assets/peshkash-demo-section-placed.png';

// ── refs ───────────────────────────────────────────────────────
const cvs       = ref<HTMLCanvasElement | null>(null);
const heroDemoInnerRef = ref<HTMLElement | null>(null);
const demoImgInnerRef  = ref<HTMLElement | null>(null);
const topVisible = ref(false);
const openFaq   = ref(0);
const scanned   = ref(false);
const activeBiz = ref<string | null>(null);
const stepRefs  = reactive<HTMLElement[]>([]);

// ── Three.js accent color (changed by business type) ──────────
let accentColor = new THREE.Color('#BD945A');

// ── content data ───────────────────────────────────────────────
const bizTags = [
  { icon:'bi-cup-hot-fill',  label:'Food' },
  { icon:'bi-palette-fill',  label:'Art & Decor' },
  { icon:'bi-bag-fill',      label:'Fashion' },
  { icon:'bi-house-door-fill', label:'Furniture' },
  { icon:'bi-cup-fill',      label:'Wine & Spirits' },
  { icon:'bi-tools',         label:'Services' },
  { icon:'bi-stars',         label:'+ literally anything' },
];

const businesses = [
  { id:'baker',      icon:'bi-basket2-fill', label:'Baker',       color:'#D4A87A',
    headline:'Your recipes, loved beyond the counter.',
    copy:'Put a QR on every box. Customers scan — ingredients, allergen info, how to reorder — long after the last bite.',
    features:['Ingredient & allergen pages','Re-order link for regulars','Recipe cards people share on WhatsApp','QR on packaging → repeat customers'] },
  { id:'artist',     icon:'bi-palette-fill', label:'Artist',      color:'#CBB897',
    headline:'Your art, discovered even after the market.',
    copy:'One QR next to any piece. Visitors see your full portfolio, buy prints, commission work — from a market stall or gallery wall.',
    features:['Full portfolio page','Buy prints / commission link','Your story, process, photos','QR beside any artwork, forever'] },
  { id:'restaurant', icon:'bi-egg-fried', label:'Restaurant',  color:'#BD945A',
    headline:'No more printed menus. No more reprint costs.',
    copy:'A digital menu on every table. Update dishes and prices in seconds — customers always see the latest.',
    features:['Full menu with photos & tags','Live update — change anything instantly','Allergen & dietary info','One QR per table, forever'] },
  { id:'studio',     icon:'bi-camera-fill', label:'Studio',      color:'#D4A87A',
    headline:'Your schedule, portfolio, one scan.',
    copy:'Show your schedule, booking link, gallery, and contact — all from a QR your clients save and share.',
    features:['Schedule & booking link','Portfolio gallery','Shareable contact card','New clients via existing shares'] },
  { id:'stall',      icon:'bi-shop', label:'Market Stall',color:'#CBB897',
    headline:'Look 10× more professional than the next stall.',
    copy:'A QR on your banner makes you instantly credible. Customers scan and remember you long after the market ends.',
    features:['Product catalogue page','WhatsApp order link','Location & hours','Customers save and share you'] },
  { id:'exhibition', icon:'bi-image-fill', label:'Exhibition',  color:'#BD945A',
    headline:'Visitors leave. Your presence stays.',
    copy:'A QR beside your exhibit turns a visitor into a long-term connection — they see your work and share you.',
    features:['Full catalogue & exhibit details','Your story & statement','Contact & commission link','Scans tracked'] },
  { id:'other',      icon:'bi-stars', label:'Something else', color:'#9A7240',
    headline:'Whatever you sell, this still works.',
    copy:'Furniture, wine, flowers, repair services, tuition classes, jewellery — it doesn\'t matter what\'s on your shelf or your menu. If a customer can walk up and want something, a QR turns that moment into a lead you keep forever.',
    features:['Your products or services, one scannable page','Capture every walk-in as a lead','Update anytime — no developer needed','Works for literally any offline business'] },
];

const currentBiz = computed(() => businesses.find(b => b.id === activeBiz.value) ?? null);

const steps = [
  { icon:'bi-chat-dots-fill',  title:'Tell us your business', body:'WhatsApp your content — menu, portfolio, catalogue. We build your page in 24–48 hours.' },
  { icon:'bi-qr-code',         title:'Get your QR plate',     body:'We print a quality plate from ₹49. Yours forever — place it anywhere customers look.' },
  { icon:'bi-graph-up-arrow',  title:'Watch insights grow',   body:'Every scan tracked. Visitors, peak times, popular pages. Offline, finally visible.' },
];

const demoChecks = ['Works on every phone','Shareable WhatsApp link','Live updates instantly','Scan analytics tracked'];

const faqs = [
  { q:'Does my customer need to download anything?',
    a:'Nothing. They scan with their camera and your page opens in their browser — like a website. No app, no account.' },
  { q:'I don\'t see my business listed above. Does this still work?',
    a:'Yes — the examples are just a starting point. Furniture stores, wine shops, tuition classes, repair services, jewellers — if you have customers who show up in person, Peshkash works for you.' },
  { q:'How much does it cost?',
    a:'WhatsApp us and you\'ll have a custom plan within 24 hours. Most businesses start under ₹1,500 with no subscription.' },
  { q:'Can I reuse the QR plate forever?',
    a:'Yes. Print once and we update what it points to anytime. Same plate, always current.' },
  { q:'What insights do I actually get?',
    a:'Scan counts, unique visitors, peak times, and which pages get the most views — so you know what\'s working.' },
];

// ── interactions ───────────────────────────────────────────────
function setParticleAccent(color: string) {
  accentColor = new THREE.Color(color);
}
function clearHoverColor() { /* mouse left biz tag */ }
function setHoverColor(_t: string) { /* subtle accent on hover */ }
function onCtaHover() { /* attract particles toward CTA */ }
function onCtaLeave() { /* release particles */ }
function pulseNode(_id: string) { /* node pulse effect */ }

function tilt(e: MouseEvent, i: number) {
  const el = stepRefs[i]; if (!el) return;
  const r = el.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width  - 0.5) * 20;
  const y = ((e.clientY - r.top)  / r.height - 0.5) * -20;
  el.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) translateY(-6px)`;
}
function untilt(i: number) {
  const el = stepRefs[i]; if (el) el.style.transform = '';
}

// Alternates entrance direction per index — left / depth / right
function dirClass(i: number) {
  return ['dir-l', 'dir-d', 'dir-r'][i % 3];
}


// ── THREE.JS PARTICLE NETWORK ─────────────────────────────────
let animId = 0;
let renderer: THREE.WebGLRenderer | null = null;

function initNetwork(canvas: HTMLCanvasElement) {
  const W = window.innerWidth, H = window.innerHeight;

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  // Opaque warm cream — canvas IS the page background
  renderer.setClearColor(new THREE.Color('#F5F2EE'), 1);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, W/H, 0.1, 100);
  camera.position.z = 5;

  // ── Particles ────────────────────────────────────────────
  const N = W < 768 ? 200 : 350; // kept low so O(n²) line-checks stay under 16ms
  const pPos = new Float32Array(N * 3);
  const pCol = new Float32Array(N * 3);
  const pVel = new Float32Array(N * 3);
  const pOrig = new Float32Array(N * 3);

  // Darker particles so they're visible on the cream background
  const gold  = new THREE.Color('#9A7240'); // dark amber
  const gold2 = new THREE.Color('#BD945A'); // medium gold
  const cream = new THREE.Color('#7A5A30'); // dark warm brown

  for (let i = 0; i < N; i++) {
    // Distribute in a disc — particles fill the viewport plane
    const ang = Math.random() * Math.PI * 2;
    const r   = Math.sqrt(Math.random()) * 6;
    const x   = Math.cos(ang) * r;
    const y   = Math.sin(ang) * r * 0.65;
    const z   = (Math.random() - 0.5) * 3;

    pPos[i*3]=x; pPos[i*3+1]=y; pPos[i*3+2]=z;
    pOrig[i*3]=x; pOrig[i*3+1]=y; pOrig[i*3+2]=z;

    const rnd = Math.random();
    const c   = rnd < 0.6 ? gold : rnd < 0.85 ? gold2 : cream;
    pCol[i*3]=c.r; pCol[i*3+1]=c.g; pCol[i*3+2]=c.b;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color',    new THREE.BufferAttribute(pCol, 3));
  // Bolder, more prominent dots — they're the focal point now, not the lines
  const pMat = new THREE.PointsMaterial({
    size: 0.052, vertexColors: true,
    transparent: true, opacity: 0.95,
    sizeAttenuation: true, depthWrite: false,
  });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // ── Line connections (pre-allocated buffer) ────────────────
  const MAX_LINES = N * 6; // max connections
  const linePos = new Float32Array(MAX_LINES * 2 * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  // Dimmer, sparser lines — delicate constellation threads, not a dense mesh
  const lineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#BD945A'),
    transparent: true, opacity: 0.09,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // ── State ──────────────────────────────────────────────────
  const mouse = { x: 0, y: 0, wx: 0, wy: 0 }; // screen + world coords
  const camLerp = { x: 0, y: 0 };
  let scrollY = 0;
  const CONNECT_DIST = 1.0; // smaller = sparser, more delicate constellation lines
  const REPEL_DIST   = 1.2; // mouse repulsion radius

  const onMM = (e: MouseEvent) => {
    const nx = e.clientX / window.innerWidth  - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    mouse.x = nx; mouse.y = ny;
    // Convert to rough world coords (at z=0 plane, camera at z=5)
    mouse.wx = nx * 10;
    mouse.wy = -ny * 6.5;
  };
  const onSc = () => { scrollY = window.scrollY; };
  const onRz = () => {
    const W2 = window.innerWidth, H2 = window.innerHeight;
    camera.aspect = W2/H2; camera.updateProjectionMatrix();
    renderer!.setSize(W2, H2);
  };
  window.addEventListener('mousemove', onMM, { passive: true });
  window.addEventListener('scroll',    onSc, { passive: true });
  window.addEventListener('resize',    onRz, { passive: true });

  // ── Animate ────────────────────────────────────────────────
  let tick = 0;
  function animate() {
    animId = requestAnimationFrame(animate);
    tick++;
    const t    = tick * 0.0007;
    const prog = scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);

    // Camera parallax — subtle, follows mouse
    camLerp.x += (mouse.x * 0.8 - camLerp.x) * 0.04;
    camLerp.y += (-mouse.y * 0.5 - camLerp.y) * 0.04;
    camera.position.x = camLerp.x;
    camera.position.y = camLerp.y;
    camera.position.z = 5 - prog * 2; // camera moves in on scroll
    camera.lookAt(0, 0, 0);

    // ── Particle physics ──────────────────────────────────
    const pos = pGeo.attributes.position.array as Float32Array;
    const col = pGeo.attributes.color.array as Float32Array;

    for (let i = 0; i < N; i++) {
      const ix = i*3, iy = i*3+1, iz = i*3+2;

      // Gentle drift — each particle has unique phase
      const phase = i * 0.37;
      const drift_x = Math.sin(t * 0.8 + phase) * 0.0008;
      const drift_y = Math.cos(t * 0.6 + phase * 1.3) * 0.0006;

      // Spring back toward origin
      const ox = pOrig[ix], oy = pOrig[iy];
      pVel[ix] += (ox - pos[ix]) * 0.004 + drift_x;
      pVel[iy] += (oy - pos[iy]) * 0.004 + drift_y;

      // Mouse repulsion
      const dx = pos[ix] - mouse.wx;
      const dy = pos[iy] - mouse.wy;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < REPEL_DIST && d > 0.01) {
        const f = (REPEL_DIST - d) / REPEL_DIST * 0.025;
        pVel[ix] += (dx/d) * f;
        pVel[iy] += (dy/d) * f;
      }

      // Damping
      pVel[ix] *= 0.88;
      pVel[iy] *= 0.88;

      pos[ix] += pVel[ix];
      pos[iy] += pVel[iy];

      // Subtle color shift toward accent on hover
      const distToAccent = d < 2 ? (2-d)/2 : 0;
      col[ix] += (accentColor.r - col[ix]) * distToAccent * 0.02;
      col[iy] += (accentColor.g - col[iy]) * distToAccent * 0.02;
      col[iz] += (accentColor.b - col[iz]) * distToAccent * 0.02;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;

    // ── Connection lines ──────────────────────────────────
    // Build line segments for nearby particle pairs
    let lineCount = 0;
    for (let i = 0; i < N && lineCount < MAX_LINES - 2; i++) {
      for (let j = i+1; j < N && lineCount < MAX_LINES - 2; j++) {
        const dx = pos[i*3]   - pos[j*3];
        const dy = pos[i*3+1] - pos[j*3+1];
        const dz = pos[i*3+2] - pos[j*3+2];
        const d2 = dx*dx + dy*dy + dz*dz;
        if (d2 < CONNECT_DIST * CONNECT_DIST) {
          const base = lineCount * 6;
          linePos[base]   = pos[i*3];
          linePos[base+1] = pos[i*3+1];
          linePos[base+2] = pos[i*3+2];
          linePos[base+3] = pos[j*3];
          linePos[base+4] = pos[j*3+1];
          linePos[base+5] = pos[j*3+2];
          lineCount++;
        }
      }
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.setDrawRange(0, lineCount * 2);

    // Line opacity pulses very subtly — dots stay the focal point
    lineMat.opacity = 0.07 + Math.sin(t * 1.5) * 0.02;


    // Continuous scroll parallax on hero QR demo + main demo image —
    // separate inner elements so this doesn't fight the CSS entrance transition
    if (heroDemoInnerRef.value) {
      heroDemoInnerRef.value.style.setProperty('--py', `${Math.min(scrollY * 0.05, 40)}px`);
    }
    if (demoImgInnerRef.value) {
      const r = demoImgInnerRef.value.getBoundingClientRect();
      const center = r.top + r.height / 2 - window.innerHeight / 2;
      demoImgInnerRef.value.style.setProperty('--py', `${(-center * 0.05).toFixed(1)}px`);
    }

    renderer!.render(scene, camera);
  }
  animate();

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('mousemove', onMM);
    window.removeEventListener('scroll',    onSc);
    window.removeEventListener('resize',    onRz);
    pGeo.dispose(); pMat.dispose();
    lineGeo.dispose(); lineMat.dispose();
    renderer?.dispose();
  };
}

// ── lifecycle ──────────────────────────────────────────────────
let cleanup: (()=>void)|null = null;

onMounted(async () => {
  // Start Three.js
  if (cvs.value) {
    try { cleanup = initNetwork(cvs.value); }
    catch(e) { console.warn('WebGL unavailable', e); }
  }

  // Observe all .scene-in elements — hero ones fire immediately since they're in viewport,
  // below-fold ones animate in as the user scrolls to them
  const io = new IntersectionObserver(es => {
    es.forEach(e => {
      if (e.isIntersecting) {
        (e.target as HTMLElement).classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll<HTMLElement>('.scene-in').forEach(el => io.observe(el));

  window.addEventListener('scroll', () => { topVisible.value = window.scrollY > 500; }, { passive: true });
});

onBeforeUnmount(() => cleanup?.());
const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
</script>

<style scoped>
/* ── TOKENS — light/cream theme (matches VendorCardPage palette) ── */
.site {
  --g:   #BD945A;  /* product gold */
  --g2:  #D4A87A;
  --g3:  #CBB897;
  --cr:  #F5F2EE;  /* warm cream */
  --p:   #EBE7E1;  /* slightly darker cream */
  --dk:  #1a1410;  /* warm dark text (product's text colour) */
  --sub: #564c40;  /* muted text — darkened from product's #6c6560 for contrast
                       against the busy particle/QR background */
  --div: #e6ddd2;  /* dividers */
  --w:   #ffffff;
  /* WhatsApp accent re-toned to a warm olive so it sits inside the gold/
     cream palette instead of popping as a saturated, off-brand emerald */
  --wa:  #6F8C4F;
  --wad: #5C7640;
  color: var(--dk);
  font-family: 'Urbanist', sans-serif;
  overflow-x: hidden;
}

/* Cream fallback — matches canvas clearColor so no flash if WebGL is slow */
:global(html), :global(body) {
  background: #F5F2EE;
  scroll-behavior: smooth;
  /* scroll-snap was removed — it made scroll position jump/settle on its
     own mid-gesture, which felt broken rather than guided */
  overflow-x: hidden;
}

/* ── CANVAS: z-index 0 — sits above html/body bg ─────────── */
.net-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

/* ── PAGE: above canvas ──────────────────────────────────── */
.page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
}

/* ── SCENE ENTRANCE ANIMATIONS ───────────────────────────── */
/* Content flies in from the background or from the side — not just a fade */
.scene-in {
  opacity: 0;
  transform: perspective(1000px) rotateX(8deg) translateY(50px);
  transition:
    opacity   0.85s cubic-bezier(.16,1,.3,1) var(--d,0s),
    transform 0.85s cubic-bezier(.16,1,.3,1) var(--d,0s),
    filter    0.85s cubic-bezier(.16,1,.3,1) var(--d,0s);
}
/* Pans in from the left, slightly rotated as if turning toward the viewer */
.scene-in.dir-l { transform: perspective(1100px) translateX(-100px) rotateY(16deg); }
/* Pans in from the right */
.scene-in.dir-r { transform: perspective(1100px) translateX(100px) rotateY(-16deg); }
/* Emerges from the depth of the particle field — scales up out of a blur */
.scene-in.dir-d { transform: perspective(1100px) scale(0.78) translateY(55px); filter: blur(10px); }
/* .in always wins regardless of which dir-* variant set the "from" state */
.scene-in.in {
  opacity: 1 !important;
  transform: perspective(1100px) translateX(0) translateY(0) rotateX(0) rotateY(0) scale(1) !important;
  filter: none !important;
}

/* Continuous scroll-driven parallax layer — separate element from .scene-in
   so the one-shot entrance transition and the per-frame JS transform never fight */
.hero-demo-inner, .demo-img-inner {
  transform: translateY(var(--py, 0px));
  will-change: transform;
}

/* ── KICKER / LABELS ─────────────────────────────────────── */
.kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.67rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--g);
  margin-bottom: 1.75rem;
}
.kdot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--g);
  animation: glow 2s infinite;
  flex-shrink: 0;
}
@keyframes glow { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(1.5)} }
.lbl {
  font-size: 0.67rem; font-weight: 900;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--g); display: block; margin-bottom: 0.85rem;
}

/* ── HEADINGS ────────────────────────────────────────────── */
.h1 {
  font-family: 'Rufina', serif;
  font-size: clamp(2.8rem, 7vw, 6rem);
  font-weight: 700;
  line-height: 1.05;
  color: var(--dk);
  letter-spacing: -0.035em;
  margin-bottom: 1.5rem;
}
.h1 em { font-style: italic; color: var(--g); }
.h2 {
  font-family: 'Rufina', serif;
  font-size: clamp(2rem, 4.5vw, 3.4rem);
  font-weight: 700;
  color: var(--dk);
  line-height: 1.08;
  letter-spacing: -0.025em;
  margin-bottom: 0.5rem;
}
.h2 em { font-style: italic; color: var(--g); }
.sec-sub { font-size: 0.95rem; color: var(--sub); margin-bottom: 2.5rem; }

/* ═══════════════════════════════════════════════════════════
   HERO — full viewport, transparent bg
═══════════════════════════════════════════════════════════ */
.hero {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  padding: 8rem max(1.5rem, 5vw) 3rem;
}
@media (max-width: 860px) {
  .hero { grid-template-columns: 1fr; padding: 6rem max(1.5rem,5vw) 3rem; }
}

/* Readability scrim — text needs a soft backdrop to stay legible over
   the particle network on every screen size, not just mobile */
.hero-content {
  background: rgba(245,242,238,.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 2rem;
  /* No negative margin — that was the source of the horizontal
     overflow on mobile (a bleed effect isn't worth a broken viewport) */
}
@media (max-width: 860px) {
  .hero-content { padding: 1.5rem 1.25rem; }
}

.hero-p {
  font-size: 1rem;
  color: var(--sub);
  line-height: 1.78;
  max-width: 440px;
  margin-bottom: 2.25rem;
}

/* Stats strip — spans full width at the bottom of the hero grid */
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 2rem; }

.cta-wa {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, var(--g), var(--g2));
  color: #0a0908; font-weight: 800; font-size: 0.92rem;
  padding: 0.85rem 1.75rem; border-radius: 100px;
  text-decoration: none; transition: all 0.22s;
}
.cta-wa:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(189,148,90,.4); color: #0a0908; }
.cta-wa i { font-size: 1.1rem; }
.cta-soft { font-size: 0.88rem; font-weight: 600; color: var(--sub); text-decoration: none; align-self: center; transition: color 0.2s; }
.cta-soft:hover { color: var(--g); }

.biz-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.btag {
  font-size: 0.72rem; font-weight: 600; color: var(--sub);
  background: rgba(189,148,90,.08); border: 1px solid rgba(189,148,90,.2);
  padding: 0.22rem 0.75rem; border-radius: 100px; cursor: default;
  transition: all 0.22s;
}
.btag:hover { background: rgba(189,148,90,.18); color: var(--g); }
.btag i { color: var(--g); margin-right: 2px; }

/* QR scan demo — 3D card */
.hero-demo { display: flex; align-items: center; justify-content: center; }
@media (max-width: 860px) { .hero-demo { display: none; } }

.demo-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.demo-qr-card {
  background: var(--cr); border: 2px solid var(--g);
  border-radius: 16px; padding: 1rem; width: 158px;
  cursor: pointer; position: relative;
  box-shadow: 0 24px 60px rgba(0,0,0,.6);
  transition: transform 0.3s;
  animation: float3d 5s ease-in-out infinite;
}
.demo-qr-card:hover { animation-play-state: paused; transform: scale(1.04) rotate(-1.5deg); }
@keyframes float3d {
  0%, 100% { transform: perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px); }
  50%      { transform: perspective(800px) rotateX(2deg) rotateY(-3deg) translateY(-9px); }
}
.demo-qr-img { width: 100%; display: block; border-radius: 6px; }
.demo-scan-label {
  position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%);
  background: var(--g); color: #0a0908;
  font-size: 0.62rem; font-weight: 900;
  padding: 0.2rem 0.8rem; border-radius: 100px; white-space: nowrap;
}
.demo-connector { width: 1.5px; height: 0; background: var(--g); transition: height 0.4s; opacity: 0; }
.demo-connector.show { height: 60px; opacity: 1; }

.demo-phone {}
.dph-shell {
  width: 148px; background: #1c1c1c;
  border-radius: 26px; border: 7px solid #2a2a2a; overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,.7);
}
.dph-notch { height: 12px; background: #111; position: relative; }
.dph-notch::after { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:36px; height:6px; border-radius:3px; background:#222; }
.dph-screen { width: 100%; height: 110px; object-fit: cover; object-position: top; display: block; }
.dph-insights { background: #EBE7E1; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
.dph-insights div { font-size: 0.58rem; font-weight: 700; color: #1a1410; display: flex; align-items: center; gap: 5px; }
.dph-insights i { color: var(--g); font-size: 0.65rem; }

.phone-reveal-enter-active { transition: all 0.45s cubic-bezier(.16,1,.3,1); }
.phone-reveal-enter-from { opacity: 0; transform: translateY(-15px) scale(0.94); }

/* ═══════════════════════════════════════════════════════════
   SECTIONS — mostly transparent, content floats in 3D space
═══════════════════════════════════════════════════════════ */
.section { padding: 7rem max(1.5rem, 5vw); }

/* Generic readability scrim for naked text blocks sitting on the canvas */
.text-scrim {
  background: rgba(245,242,238,.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 2rem;
  display: inline-block;
  width: 100%;
}
@media (max-width: 860px) { .text-scrim { padding: 1.5rem 1.25rem; } }
.how-intro { margin-bottom: 0; }

/* ── FOMO / MARKETING PUNCH ──────────────────────────────── */
.fomo-sec { text-align: center; max-width: 920px; margin: 0 auto; }
.fomo-intro {
  background: rgba(245,242,238,.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 2rem;
  margin-bottom: 1.5rem;
}
@media (max-width: 860px) { .fomo-intro { padding: 1.5rem 1.25rem; } }
.fomo-h2 {
  margin: 0 auto 1rem; max-width: 720px;
}
.fomo-h2 em { font-style: italic; color: var(--g); }
.fomo-sub {
  font-size: 1rem; color: var(--sub); line-height: 1.75;
  max-width: 600px; margin: 0 auto 3rem;
}
.fomo-grid {
  display: flex; flex-direction: column; gap: 0.9rem;
  margin-bottom: 3rem; align-items: center;
}
.fomo-card {
  display: flex; align-items: center; gap: 0.85rem; justify-content: center;
  background: rgba(255,255,255,.65); border: 1.5px solid var(--div);
  border-radius: 100px; padding: 1rem 2.25rem;
  backdrop-filter: blur(6px); flex-wrap: wrap;
  box-shadow: 0 2px 14px rgba(189,148,90,.08);
  animation: float3d 6s ease-in-out infinite;
}
.fomo-card:hover { animation-play-state: paused; }
.fomo-card:nth-child(1) { animation-delay: 0s; }
.fomo-card:nth-child(2) { animation-delay: 0.4s; }
.fomo-card:nth-child(3) { animation-delay: 0.8s; }
.fomo-num    { font-family: 'Rufina', serif; font-size: 1.2rem; font-weight: 700; color: var(--dk); }
.fomo-eq     { font-family: 'Rufina', serif; font-size: 1.2rem; font-weight: 700; color: var(--g); }
.fomo-result { font-family: 'Rufina', serif; font-size: 1.2rem; font-weight: 700; color: var(--g); }
.fomo-tagline {
  font-family: 'Rufina', serif; font-style: italic;
  font-size: clamp(1.15rem, 2.4vw, 1.7rem);
  color: var(--dk); margin-bottom: 0.75rem; line-height: 1.4;
}
.fomo-tagline em { color: var(--g); font-style: italic; }
.fomo-tagline2 {
  font-size: 0.85rem; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--sub); margin-bottom: 0;
}

/* ── BUSINESS PICKER ─────────────────────────────────────── */

/* Pills as glowing network nodes */
.node-pills {
  display: flex; flex-wrap: wrap; gap: 10px;
  margin: 2rem 0;
}
.node-pill {
  position: relative;
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,.7);
  border: 1.5px solid var(--div);
  color: var(--sub);
  font-size: 0.88rem; font-weight: 700;
  padding: 0.6rem 1.25rem; border-radius: 100px;
  cursor: pointer; transition: all 0.25s; font-family: inherit;
  overflow: hidden;
  backdrop-filter: blur(4px);
}
.np-glow {
  position: absolute; inset: 0; border-radius: 100px;
  background: radial-gradient(circle at 50% 50%, rgba(189,148,90,.3), transparent 70%);
  opacity: 0; transition: opacity 0.25s;
  pointer-events: none;
}
.node-pill:hover .np-glow,
.node-pill.active .np-glow { opacity: 1; }
.node-pill:hover {
  border-color: var(--g);
  color: var(--g);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(189,148,90,.2), 0 2px 8px rgba(0,0,0,.08);
}
.node-pill.active {
  background: var(--g);
  border-color: var(--g);
  color: var(--w);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(189,148,90,.4);
}
.np-icon { font-size: 1.05rem; color: var(--g); }
.node-pill.active .np-icon { color: var(--w); }

/* Business content — floats in the dark */
.biz-content {
  display: grid; grid-template-columns: 1.2fr 1fr;
  gap: 3rem; align-items: start; margin-top: 1.5rem;
  padding: 2rem;
  background: rgba(255,255,255,.85);
  border: 1.5px solid var(--g);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 32px rgba(189,148,90,.12);
}
@media (max-width: 768px) { .biz-content { grid-template-columns: 1fr; } }

.biz-big-emoji { font-size: 2.6rem; color: var(--g); display: block; margin-bottom: 0.75rem; line-height: 1; }
.biz-h3 {
  font-family: 'Rufina', serif; font-size: clamp(1.4rem,2.5vw,2rem);
  font-weight: 700; color: var(--dk); margin-bottom: 0.75rem; letter-spacing: -0.02em;
}
.biz-p { font-size: 0.92rem; color: var(--sub); line-height: 1.72; margin-bottom: 1.5rem; }
.biz-cta {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--wa); color: #fff;
  font-weight: 800; font-size: 0.9rem;
  padding: 0.78rem 1.6rem; border-radius: 100px;
  text-decoration: none; transition: all 0.22s;
}
.biz-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(111,140,79,.35); background: var(--wad); color: #fff; }
.biz-cta i { font-size: 1.05rem; }

.biz-features { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
.biz-feat {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 0.9rem; color: var(--sub);
  padding: 0.75rem 0; border-bottom: 1px solid var(--div);
}
.biz-feat:last-child { border-bottom: none; }
.biz-feat i { color: var(--g); font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
.biz-hint { color: var(--sub); font-size: 0.95rem; padding: 2rem 0; }
.biz-hint i { color: var(--g); margin-right: 4px; }

.biz-reveal-enter-active, .biz-reveal-leave-active {
  transition: all 0.35s cubic-bezier(.16,1,.3,1);
}
.biz-reveal-enter-from { opacity: 0; transform: perspective(800px) rotateX(10deg) translateY(20px); }
.biz-reveal-leave-to   { opacity: 0; transform: perspective(800px) rotateX(-5deg) translateY(-10px); }

/* ── HOW IT WORKS ────────────────────────────────────────── */
.steps-track { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: 3rem; }
.step-node {
  flex: 1; min-width: 220px; position: relative;
  background: rgba(255,255,255,.8);
  border: 1.5px solid var(--div);
  border-radius: 16px; padding: 2rem;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(0,0,0,.06);
  transition: transform 0.2s ease, border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;
}
.step-node:hover { border-color: var(--g); box-shadow: 0 8px 28px rgba(189,148,90,.18); }
.sn-glow {
  position: absolute; inset: 0; border-radius: 16px;
  background: radial-gradient(circle at 50% 0%, rgba(189,148,90,.12), transparent 70%);
  opacity: 0; transition: opacity 0.3s; pointer-events: none;
}
.step-node:hover .sn-glow { opacity: 1; }
.sn-num {
  font-family: 'Rufina', serif; font-size: 3.5rem;
  font-weight: 700; color: rgba(189,148,90,.15); line-height: 1;
  display: block; margin-bottom: 0.5rem;
}
.sn-icon { font-size: 1.6rem; color: var(--g); display: block; margin-bottom: 0.75rem; line-height: 1; }
.step-node h4 { font-size: 1rem; font-weight: 800; color: var(--dk); margin-bottom: 0.5rem; }
.step-node p  { font-size: 0.875rem; color: var(--sub); line-height: 1.7; margin: 0; }

/* ── DEMO ────────────────────────────────────────────────── */
.demo-section {
  display: grid; grid-template-columns: 1.2fr 1fr;
  gap: 5rem; align-items: center;
}
@media (max-width: 860px) {
  .demo-section { grid-template-columns: 1fr; gap: 3rem; }
  .demo-text { padding: 1.5rem 1.25rem; }
}
.demo-text {
  background: rgba(245,242,238,.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 2rem;
}
.demo-img-wrap { position: relative; }
.demo-big-img {
  width: 100%; border-radius: 16px; display: block;
  box-shadow: 0 24px 60px rgba(0,0,0,.5);
  animation: sway3d 8s ease-in-out infinite;
}
@keyframes sway3d {
  0%, 100% { transform: perspective(1200px) rotateY(0deg) rotateX(0deg); }
  50%      { transform: perspective(1200px) rotateY(1.2deg) rotateX(-0.6deg); }
}
.demo-overlay-tag {
  position: absolute;
  background: rgba(10,9,8,.9); backdrop-filter: blur(8px);
  border: 1px solid rgba(189,148,90,.3); color: rgba(255,255,255,.85);
  font-size: 0.7rem; font-weight: 700;
  padding: 0.35rem 0.85rem; border-radius: 100px;
  display: flex; align-items: center; gap: 5px;
}
.demo-overlay-tag i { color: var(--g); }
.dot-a { top: -11px; left: 20px; }
.dot-b { bottom: 20px; right: -10px; }
.dot-c { top: 38%; left: -10px; }
.demo-p { font-size: 0.93rem; color: var(--sub); line-height: 1.75; margin-bottom: 1.25rem; }
.demo-checks { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.demo-checks li { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--sub); }
.demo-checks li i { color: var(--g); }
.demo-tag {
  font-family: 'Rufina', serif; font-style: italic;
  font-size: 1.05rem; color: var(--g); margin: 1.5rem 0 0;
}

/* ── FAQ ─────────────────────────────────────────────────── */
.faq-sec { display: grid; grid-template-columns: 280px 1fr; gap: 5rem; align-items: start; }
@media (max-width: 860px) { .faq-sec { grid-template-columns: 1fr; gap: 3rem; } }
.faq-head {
  position: sticky; top: 5rem;
  background: rgba(245,242,238,.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 2rem;
}
@media (max-width: 860px) {
  .faq-head { position: static; padding: 1.5rem 1.25rem; margin-bottom: 1rem; }
}
.wa-sm {
  display: inline-flex; align-items: center; gap: 7px;
  background: var(--wa); color: #fff; font-weight: 800; font-size: 0.86rem;
  padding: 0.65rem 1.35rem; border-radius: 100px;
  text-decoration: none; transition: all 0.22s; margin-top: 1.25rem;
}
.wa-sm:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(111,140,79,.35); background: var(--wad); color: #fff; }

.faq-body { display: flex; flex-direction: column; }
.faq-item { border-bottom: 1px solid var(--div); cursor: pointer; user-select: none; }
.faq-item-wrap:first-child .faq-item { border-top: 1px solid var(--div); }
.faq-q {
  display: flex; justify-content: space-between; align-items: center; gap: 1rem;
  font-size: 0.93rem; font-weight: 700; color: var(--dk);
  padding: 1.25rem 0; transition: color 0.2s;
}
.faq-item:hover .faq-q, .faq-item.open .faq-q { color: var(--g); }
.faq-ic {
  width: 26px; height: 26px; border-radius: 50%;
  background: rgba(189,148,90,.1); border: 1px solid rgba(189,148,90,.25);
  color: var(--g); font-size: 1.1rem; font-weight: 300;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.28s;
}
.faq-ic.r { transform: rotate(45deg); background: var(--g); color: #0a0908; border-color: var(--g); }
.faq-ans { overflow: hidden; transition: max-height 0.38s ease, opacity 0.3s ease; }
.faq-ans p { font-size: 0.875rem; color: var(--sub); line-height: 1.75; padding-bottom: 1.25rem; margin: 0; }

/* ── CONTACT ──────────────────────────────────────────────── */
.contact-sec { display: grid; grid-template-columns: 1fr 1.1fr; gap: 5rem; align-items: start; }
@media (max-width: 860px) {
  .contact-sec { grid-template-columns: 1fr; gap: 3rem; }
  .ct-left { padding: 1.5rem 1.25rem; }
}
.ct-left {
  background: rgba(245,242,238,.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 2rem;
}
.ct-h2 em { color: var(--g); font-style: italic; }
.ct-p { font-size: 0.93rem; color: var(--sub); line-height: 1.7; margin-bottom: 0.75rem; max-width: 360px; }
.ct-campaign {
  font-family: 'Rufina', serif; font-style: italic;
  font-size: 1.05rem; color: var(--g); margin-bottom: 2rem;
}
.wa-big {
  display: flex; align-items: center; gap: 1rem;
  background: rgba(111,140,79,.08); border: 1px solid rgba(111,140,79,.3);
  border-radius: 12px; padding: 0.9rem 1.2rem;
  text-decoration: none; transition: all 0.22s; margin-bottom: 1.5rem;
}
.wa-big:hover { background: rgba(111,140,79,.15); border-color: rgba(111,140,79,.5); transform: translateX(4px); }
.wab-icon { width: 42px; height: 42px; border-radius: 10px; background: var(--wa); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; }
.wa-big strong { display: block; font-size: 0.92rem; font-weight: 800; color: var(--dk); }
.wa-big small  { font-size: 0.72rem; color: var(--sub); }
.ct-links { display: flex; flex-direction: column; gap: 0.55rem; }
.ct-links a { display: inline-flex; align-items: center; gap: 8px; color: var(--sub); font-size: 0.86rem; text-decoration: none; transition: color 0.2s; }
.ct-links a:hover { color: var(--g); }
.ct-links a i { color: var(--g); }

.ct-right {
  background: rgba(255,255,255,.82); border: 1.5px solid var(--div);
  border-radius: 16px; padding: 2.5rem;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 28px rgba(189,148,90,.1);
}
.ct-right h4 { font-family: 'Rufina', serif; font-size: 1.4rem; font-weight: 700; color: var(--dk); margin-bottom: 1.5rem; }
.f2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 540px) { .f2 { grid-template-columns: 1fr; } }
.ct-right label { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
.ct-right label span { font-size: 0.64rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sub); }
.ct-right input, .ct-right select, .ct-right textarea {
  background: #fff; border: 1.5px solid var(--div);
  border-radius: 8px; padding: 0.68rem 0.9rem; color: var(--dk);
  font-size: 0.875rem; font-family: inherit; outline: none;
  transition: border-color 0.2s; width: 100%;
}
.ct-right input::placeholder, .ct-right textarea::placeholder { color: #b3a896; }
.ct-right input:focus, .ct-right select:focus, .ct-right textarea:focus { border-color: var(--g); }
.ct-right select option { background: #fff; color: var(--dk); }
.ct-right button {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(135deg, var(--g), var(--g2));
  color: #0a0908; font-weight: 800; font-size: 0.95rem;
  padding: 0.88rem; border: none; border-radius: 100px;
  cursor: pointer; transition: all 0.22s; margin-top: 0.5rem; font-family: inherit;
}
.ct-right button:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(189,148,90,.38); }

/* ── FOOTER ──────────────────────────────────────────────── */
.footer { background: rgba(5,4,2,.97); border-top: 1px solid rgba(189,148,90,.12); padding: 3rem max(1.5rem,5vw) 0; }
.ft-inner { display: flex; gap: 4rem; flex-wrap: wrap; padding-bottom: 2.5rem; border-bottom: 1px solid rgba(189,148,90,.1); max-width: 1200px; margin: 0 auto; }
.fb { flex: 1; min-width: 200px; }
.fb-brand { display: flex; align-items: center; gap: 8px; margin-bottom: 0.5rem; }
.fb-brand i { font-size: 1.3rem; color: var(--g); }
.fb-brand span { font-family: 'Dancing Script', cursive; font-size: 1.55rem; color: var(--w); }
.fb > p { font-size: 0.82rem; color: rgba(255,255,255,.26); line-height: 1.6; max-width: 240px; margin: 0 0 0.75rem; }
.fb-social { display: flex; gap: 9px; }
.fb-social a { width: 36px; height: 36px; border-radius: 8px; background: rgba(189,148,90,.08); border: 1px solid rgba(189,148,90,.2); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.36); text-decoration: none; font-size: 0.9rem; transition: all 0.2s; }
.fb-social a:hover { background: var(--g); color: #0a0908; border-color: var(--g); }
.ft-nav { display: flex; gap: 4rem; flex-wrap: wrap; }
.fnc { display: flex; flex-direction: column; gap: 0.55rem; }
.fnc h6 { font-size: 0.62rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: var(--g); margin-bottom: 0.2rem; }
.fnc a { font-size: 0.83rem; color: rgba(255,255,255,.28); text-decoration: none; transition: color 0.2s; }
.fnc a:hover { color: var(--g); }
.ft-bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; padding: 1.25rem 0; font-size: 0.73rem; color: rgba(255,255,255,.12); max-width: 1200px; margin: 0 auto; }

/* ── FLOATERS ────────────────────────────────────────────── */
.fwa { position: fixed; bottom: 5rem; right: 1.25rem; width: 50px; height: 50px; border-radius: 50%; background: var(--wa); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.45rem; text-decoration: none; box-shadow: 0 4px 20px rgba(111,140,79,.35); z-index: 999; transition: transform 0.2s; animation: pop .4s 1.5s both; }
.fwa:hover { transform: scale(1.1); color: #fff; }
@keyframes pop { from{opacity:0;transform:scale(0.3)} to{opacity:1;transform:scale(1)} }
.fup { position: fixed; bottom: 1.25rem; right: 1.25rem; width: 38px; height: 38px; border-radius: 8px; background: rgba(189,148,90,.12); border: 1px solid rgba(189,148,90,.25); color: var(--g); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 999; font-size: 0.9rem; transition: all 0.2s; }
.fup:hover { background: var(--g); color: #0a0908; }
</style>
