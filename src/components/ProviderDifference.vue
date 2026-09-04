<template>
  <div class="provider-difference">
    <div class="difference-intro">
      <p class="difference-kicker">The Peshkash difference</p>
      <h2>How is Peshkash different from <em>your usual provider?</em></h2>
      <p class="difference-lead">We make pages for your {{ audience }}, prepare your QR cards and show you what visitors do after scanning. You get help with the whole setup.</p>
      <p class="difference-promise">{{ promise }}</p>
    </div>

    <div class="difference-comparison">
      <div class="comparison-labels" aria-hidden="true"><span>With separate tools</span><span>With Peshkash</span></div>
      <article v-for="(row, index) in rows" :key="row.title" class="comparison-row">
        <h3><span>{{ String(index + 1).padStart(2, '0') }}</span>{{ row.title }}</h3>
        <div class="comparison-pair">
          <p class="standalone"><span class="sr-only">With separate tools: </span>{{ row.standalone }}</p>
          <p class="connected"><span class="sr-only">With Peshkash: </span>{{ row.connected }}</p>
        </div>
      </article>
      <p class="comparison-note">One team to help you set it all up.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  audience: string;
  promise: string;
  rows: { title: string; standalone: string; connected: string }[];
}>();
</script>

<style scoped>
.provider-difference {
  align-items: center;
  background: var(--paper);
  color: var(--ink);
  display: grid;
  gap: clamp(2rem, 6vw, 7rem);
  grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
  min-height: calc(100dvh - 64px);
  padding: clamp(2rem, 5vh, 4rem) clamp(1.5rem, 6vw, 6rem) 5.5rem;
  box-sizing: border-box;
}
.difference-kicker { color: #795b33; font-size: .68rem; font-weight: 700; letter-spacing: .2em; margin: 0 0 1.4rem; text-transform: uppercase; }
h2 { font-family: 'Rufina', Georgia, serif; font-size: clamp(2.5rem, 4.5vw, 5rem); font-weight: 400; letter-spacing: -.045em; line-height: 1.04; margin: 0; max-width: 650px; }
h2 em { color: #886437; font-weight: 400; }
.difference-lead { color: #625b52; font-size: 1rem; line-height: 1.65; margin: 1.5rem 0; max-width: 510px; }
.difference-promise { border-left: 2px solid var(--brass, var(--gold)); font-family: 'Rufina', Georgia, serif; font-size: 1.2rem; line-height: 1.5; margin: 1.8rem 0 0; padding-left: 1rem; max-width: 480px; }
.comparison-labels, .comparison-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.comparison-labels { color: #625b52; font-size: .63rem; font-weight: 700; letter-spacing: .12em; margin-bottom: 1rem; text-transform: uppercase; }
.comparison-labels span:last-child { color: #795b33; }
.comparison-row { border-top: 1px solid #cfc3b1; padding: 1rem 0; }
h3 { font-family: 'Rufina', Georgia, serif; font-size: 1.15rem; font-weight: 400; margin: 0 0 .65rem; }
h3 span { color: #795b33; display: inline-block; font-family: inherit; font-size: .7rem; margin-right: .8rem; }
.comparison-pair p { font-size: .86rem; line-height: 1.55; margin: 0; }
.standalone { color: #6c645a; }
.connected { color: var(--ink); font-weight: 500; }
.comparison-note { border-top: 1px solid #cfc3b1; color: #795b33; font-size: .68rem; letter-spacing: .08em; margin: 0; padding-top: 1rem; text-transform: uppercase; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 900px) {
  .provider-difference { gap: 1.75rem; grid-template-columns: 1fr; padding: 1.75rem 1.5rem 5.5rem; }
  h2 { font-size: clamp(2rem, 6vw, 3.5rem); max-width: 700px; }
  .difference-kicker { margin-bottom: .8rem; }
  .difference-lead { font-size: .88rem; line-height: 1.5; margin: 1rem 0; max-width: 650px; }
  .difference-promise { font-size: 1rem; margin-top: 1rem; max-width: 650px; }
  .comparison-labels, .comparison-pair { gap: 1rem; }
  .comparison-row { padding: .8rem 0; }
  .comparison-pair p { font-size: .8rem; }
  h3 { font-size: 1.05rem; }
}
</style>
