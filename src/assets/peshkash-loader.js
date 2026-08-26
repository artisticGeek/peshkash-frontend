class PeshkashLoader extends HTMLElement {
  static get observedAttributes() {
    return ["size", "theme", "label"];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const size = Math.max(20, Number(this.getAttribute("size")) || 180);
    const theme = this.getAttribute("theme") === "light" ? "light" : "dark";
    const label = this.getAttribute("label") || "Loading Peshkash";
    const background = theme === "light" ? "#F5F2EE" : "#1A1410";

    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-grid; place-items: center; }
        .surface {
          display: grid;
          place-items: center;
          width: ${size}px;
          height: ${size}px;
          background: ${background};
          border-radius: 12%;
          overflow: hidden;
        }
        svg { width: 82%; height: 82%; overflow: visible; }
        .part { transform-box: fill-box; animation: 5.6s cubic-bezier(.65,0,.18,1) infinite; }
        .stem { fill:#BB9057; transform-origin:50% 0%; animation-name:stem; }
        .one { fill:#E8DBCE; transform-origin:0% 70%; animation-name:one; }
        .two { fill:#C5AF9D; transform-origin:0% 50%; animation-name:two; }
        .three { fill:#8C7667; transform-origin:0% 0%; animation-name:three; }
        .crease { fill:none; stroke:#6F5B4D; stroke-width:1.1; opacity:0; animation:crease 5.6s ease-in-out infinite; }
        .frame { fill:none; stroke:#C79C62; stroke-width:4; stroke-linecap:square; stroke-linejoin:miter; stroke-dasharray:84; animation:frame 5.6s cubic-bezier(.4,0,.2,1) infinite; }
        .scan { stroke:#E8DBCE; stroke-width:2.8; stroke-linecap:round; opacity:0; filter:url(#scanGlow); animation:scan 5.6s cubic-bezier(.4,0,.2,1) infinite; }
        .paper { filter:url(#paperShadow); }
        @keyframes stem { 0%,4%{transform:scaleY(.16);opacity:.72} 19%,78%{transform:scaleY(1);opacity:1} 94%,100%{transform:scaleY(.16);opacity:.72} }
        @keyframes one { 0%,10%{transform:translateX(-5px) scaleX(.035) skewY(18deg);opacity:.22} 29%,77%{transform:none;opacity:1} 92%,100%{transform:translateX(-5px) scaleX(.035) skewY(18deg);opacity:.22} }
        @keyframes two { 0%,19%{transform:translateX(-14px) scaleX(.03) skewY(-16deg);opacity:0} 38%,72%{transform:none;opacity:1} 86%,100%{transform:translateX(-14px) scaleX(.03) skewY(-16deg);opacity:0} }
        @keyframes three { 0%,27%{transform:translate(-9px,-5px) scale(.08,.06) skewX(18deg);opacity:0} 44%,68%{transform:none;opacity:1} 80%,100%{transform:translate(-9px,-5px) scale(.08,.06) skewX(18deg);opacity:0} }
        @keyframes crease { 0%,37%,79%,100%{opacity:0} 46%,67%{opacity:.34} }
        @keyframes frame { 0%,36%{stroke-dashoffset:84;opacity:0} 47%{stroke-dashoffset:0;opacity:.72} 54%,64%{stroke-dashoffset:0;opacity:1;stroke-width:4.8} 72%{stroke-dashoffset:0;opacity:.72;stroke-width:4} 83%,100%{stroke-dashoffset:84;opacity:0} }
        @keyframes scan { 0%,46%{transform:translateY(0);opacity:0} 49%{transform:translateY(0);opacity:.96} 62%{transform:translateY(305px);opacity:.96} 66%,100%{transform:translateY(305px);opacity:0} }
        @media (prefers-reduced-motion: reduce) {
          .part,.frame,.scan,.crease{animation:none!important}.part{transform:none;opacity:1}.frame{stroke-dashoffset:0;opacity:1}.scan{display:none}.crease{opacity:.24}
        }
      </style>
      <div class="surface" role="status" aria-label="${label.replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c])}">
        <svg viewBox="0 0 360 380" aria-hidden="true">
          <defs>
            <filter id="paperShadow" x="-25%" y="-20%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#1A1410" flood-opacity=".16"/></filter>
            <filter id="scanGlow" x="-10%" y="-400%" width="120%" height="900%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <g class="paper">
            <path class="part stem" d="M100 69H157V320L129 294L100 320Z"/>
            <path class="part one" d="M156.5 69H236L281 110L156.5 181.5Z"/>
            <path class="part two" d="M281 110V167.5L235.5 215L156.5 181.5Z"/>
            <path class="part three" d="M156.5 181.5L235.5 215H156.5Z"/>
            <path class="crease" d="M156.5 181.5L281 110M156.5 181.5L235.5 215"/>
          </g>
          <g class="frame"><path d="M62 26.5H22V67"/><path d="M296 26.5H335V67"/><path d="M22 316V357H62"/><path d="M296 357H335V316"/></g>
          <path class="scan" d="M29 45H328"/>
        </svg>
      </div>`;
  }
}

if (!customElements.get("peshkash-loader")) {
  customElements.define("peshkash-loader", PeshkashLoader);
}
