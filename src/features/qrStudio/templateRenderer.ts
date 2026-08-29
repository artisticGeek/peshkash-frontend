import { renderBrandedQrSvg, svgDataUri } from './qrRenderer';
import { svgPolygonPoints, svgRibbonPoints, isOutlineShape, fontPairingFor } from './elementPresets';
import type { QrTemplateDefinition, StudioContent, StudioTheme, QrStyleId, ElementVisibility, CanvasElement, BackgroundSpec, ElementLayer, TypographySpec, ElementRect } from './types';
import logoLight from '../../assets/logo/Peshkash-Primary-For-Light.svg?raw';
import logoDark from '../../assets/logo/Peshkash-Primary-For-Dark.svg?raw';

export interface TemplateRenderOptions extends StudioContent {
  qrStyle: QrStyleId;
  theme: StudioTheme;
  visibility?: ElementVisibility;
  canvasElements?: CanvasElement[];
  background?: BackgroundSpec;
  typography?: TypographySpec;
}

export interface RenderOverrides {
  qr?: { x: number; y: number; size: number };
  copy?: ElementRect;
  merchant?: ElementRect;
  brandmark?: ElementRect;
}

function esc(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[char] ?? char);
}

const BRASS = '#BB9057';

function svgBody(svg: string): string {
  return svg.replace(/^.*?<svg[^>]*>/s, '').replace(/<\/svg>\s*$/s, '');
}

function brandLogo(x: number, y: number, width: number, dark: boolean): string {
  return `<g transform="translate(${x} ${y}) scale(${(width / 1536).toFixed(6)})">${svgBody(dark ? logoDark : logoLight)}</g>`;
}

function wrapCopy(value: string, maxChars: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > maxChars) {
      lines.push(line);
      line = word;
      if (lines.length === 2) break;
    } else line = next;
  }
  if (lines.length < 2 && line) lines.push(line);
  return lines.slice(0, 2);
}

function liveTextLines(value: string, x: number, y: number, width: number, size: number, fill: string, font: string, anchor: 'start' | 'middle' = 'start'): string {
  const maxChars = Math.max(12, Math.floor(width / (size * 0.56)));
  return wrapCopy(value, maxChars).map((line, index) =>
    `<text x="${x}" y="${(y + index * size * 1.14).toFixed(2)}" text-anchor="${anchor}" font-family="${esc(font)}" font-size="${size}" fill="${fill}">${esc(line)}</text>`,
  ).join('');
}

interface BrandKitLayout {
  copy: ElementRect;
  brandmark: ElementRect;
  merchant: ElementRect;
}

/** Exact editable-element boxes used by the checked-in Brand Kit masters. */
export function brandKitLayout(template: QrTemplateDefinition): BrandKitLayout {
  const { width, height } = template.canvas;
  const short = Math.min(width, height);
  const qrX = template.qr.x * width;
  const qrSize = template.qr.size * short;
  const qrLeft = qrX < width / 2;
  switch (template.format) {
    case 'landscape': {
      const x = qrLeft ? 548 : 78;
      return { copy: { x, y: 78, w: 560, h: 395 }, merchant: { x, y: 478, w: 310, h: 32 }, brandmark: { x, y: 510, w: 300, h: 100 } };
    }
    case 'label': {
      const x = qrLeft ? 500 : 72;
      return { copy: { x, y: 84, w: 600, h: 402 }, merchant: { x, y: 476, w: 290, h: 30 }, brandmark: { x, y: 505, w: 280, h: 94 } };
    }
    case 'ticket':
      return { copy: { x: 62, y: 70, w: 650, h: 318 }, merchant: { x: 62, y: 360, w: 270, h: 28 }, brandmark: { x: 62, y: 390, w: 260, h: 87 } };
    case 'portrait':
      return { copy: { x: 90, y: 82, w: 620, h: 805 }, merchant: { x: 250, y: 928, w: 300, h: 32 }, brandmark: { x: 250, y: 968, w: 300, h: 100 } };
    case 'tag':
      return { copy: { x: 60, y: 148, w: 480, h: 640 }, merchant: { x: 150, y: 820, w: 300, h: 30 }, brandmark: { x: 150, y: 855, w: 300, h: 100 } };
    case 'square':
      return { copy: { x: 90, y: 83, w: 620, h: 610 }, merchant: { x: 285, y: 660, w: 230, h: 24 }, brandmark: { x: 285, y: 688, w: 230, h: 77 } };
    case 'round':
      return { copy: { x: 140, y: 88, w: 620, h: 630 }, merchant: { x: 335, y: 682, w: 230, h: 24 }, brandmark: { x: 335, y: 710, w: 230, h: 77 } };
    case 'insert':
      return { copy: { x: 90, y: 82, w: 620, h: 696 }, merchant: { x: 250, y: 810, w: 300, h: 28 }, brandmark: { x: 250, y: 845, w: 300, h: 100 } };
  }
}

// Dynamic text block — skips hidden elements and adjusts Y positions accordingly.
// Returns the rendered SVG string and the final Y offset reached.
function textBlock(
  template: QrTemplateDefinition,
  options: TemplateRenderOptions,
  x: number,
  startY: number,
  width: number,
  align: 'start' | 'middle' = 'start',
): string {
  const scale = Math.min(template.canvas.width, template.canvas.height);
  const vis = options.visibility ?? {};
  const anchor = align === 'middle' ? 'middle' : 'start';
  const tx = align === 'middle' ? x + width / 2 : x;

  const pairing = fontPairingFor(options.typography?.pairingId);
  const typeScale = options.typography?.scale ?? 1;
  const eyebrowSize = Math.round(scale * 0.027 * typeScale);
  const headlineSize = Math.round(scale * 0.071 * typeScale);
  const descriptorSize = Math.round(scale * 0.032 * typeScale);
  const ctaSize = Math.round(scale * 0.026 * typeScale);
  const letterSpacingEyebrow = Math.round(scale * 0.006);
  const letterSpacingCta = Math.round(scale * 0.004);

  const parts: string[] = [];
  let y = startY;
  let hasAny = false;

  // Gold accent rule — drawn once before the first visible text line
  const showEyebrow = vis.eyebrow !== false && options.eyebrow;
  if (showEyebrow) {
    const ruleLen = width * 0.16;
    const ruleX = align === 'middle' ? tx - ruleLen / 2 : tx;
    const ruleY = (y - eyebrowSize * 0.5).toFixed(1);
    parts.push(`<line x1="${ruleX.toFixed(1)}" y1="${ruleY}" x2="${(ruleX + ruleLen).toFixed(1)}" y2="${ruleY}" stroke="#BB9057" stroke-width="1.5" opacity="0.65" stroke-linecap="round"/>`);
    parts.push(`<text x="${tx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-family="${esc(pairing.bodyFont)}" font-size="${eyebrowSize}" font-weight="700" letter-spacing="${letterSpacingEyebrow}" fill="currentColor">${esc(options.eyebrow.toUpperCase())}</text>`);
    y += eyebrowSize * 1.2 + scale * 0.022;
    hasAny = true;
  }

  if (vis.headline !== false && options.headline) {
    parts.push(`<text x="${tx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-family="${esc(pairing.displayFont)}" font-size="${headlineSize}" fill="currentColor">${esc(options.headline)}</text>`);
    y += headlineSize * 1.1 + scale * 0.014;
    hasAny = true;
  }

  if (vis.descriptor !== false && options.descriptor) {
    if (hasAny) y += scale * 0.004; // a little extra gap before descriptor
    parts.push(`<text x="${tx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-family="${esc(pairing.bodyFont)}" font-size="${descriptorSize}" opacity=".7" fill="currentColor">${esc(options.descriptor)}</text>`);
    y += descriptorSize * 1.3 + scale * 0.018;
    hasAny = true;
  }

  if (vis.cta !== false && options.cta) {
    if (hasAny) y += scale * 0.006;
    parts.push(`<text x="${tx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-family="${esc(pairing.bodyFont)}" font-size="${ctaSize}" font-weight="700" letter-spacing="${letterSpacingCta}" fill="#BB9057">${esc(options.cta.toUpperCase())}  →</text>`);
  }

  if (!parts.length) return '';
  return `<g fill="currentColor">${parts.join('')}</g>`;
}

function scanCorners(width: number, height: number, color: string): string {
  const inset = Math.min(width, height) * 0.055;
  const arm   = Math.min(width, height) * 0.075;
  const sw    = Math.max(2, Math.min(width, height) * 0.005);
  return `<g fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="square" opacity=".75">` +
    `<path d="M${(inset + arm).toFixed(1)} ${inset.toFixed(1)}H${inset.toFixed(1)}V${(inset + arm).toFixed(1)}"/>` +
    `<path d="M${(width - inset - arm).toFixed(1)} ${inset.toFixed(1)}H${(width - inset).toFixed(1)}V${(inset + arm).toFixed(1)}"/>` +
    `<path d="M${inset.toFixed(1)} ${(height - inset - arm).toFixed(1)}V${(height - inset).toFixed(1)}H${(inset + arm).toFixed(1)}"/>` +
    `<path d="M${(width - inset - arm).toFixed(1)} ${(height - inset).toFixed(1)}H${(width - inset).toFixed(1)}V${(height - inset - arm).toFixed(1)}"/>` +
    `</g>`;
}

// Brand kit logo: viewBox 0 0 1536 512, visual content x:[335,1312] y:[164,415]
function peshkashLogoImage(rightX: number, bottomY: number, logoH: number, dark: boolean): string {
  const svgW = 1536, svgH = 512;
  const cx2 = 1312, cy2 = 415, contentH = cy2 - 164;
  const scale = logoH / contentH;
  const imgW = svgW * scale;
  const imgH = svgH * scale;
  const imgX = rightX - cx2 * scale;
  const imgY = bottomY - cy2 * scale;
  const href = dark ? '/brand/peshkash-logo-dark.svg' : '/brand/peshkash-logo-light.svg';
  return `<image href="${href}" x="${imgX.toFixed(2)}" y="${imgY.toFixed(2)}" width="${imgW.toFixed(2)}" height="${imgH.toFixed(2)}"/>`;
}

// Freeform element bank layer — shapes and CTA badges the user dropped onto the canvas.
// 'back' elements render early (beneath QR/copy/merchant); 'front' (default) render last, on top
// of everything — matching the live editor's DOM order.
function renderCanvasElements(elements: CanvasElement[] | undefined, wantLayer: ElementLayer): string {
  if (!elements || !elements.length) return '';
  return elements
    .filter((el) => (el.layer ?? 'front') === wantLayer)
    .map((el) => {
      const opacity = el.opacity ?? 1;
      if (el.kind === 'image') {
        return `<image href="${el.src}" x="${el.x.toFixed(1)}" y="${el.y.toFixed(1)}" width="${el.w.toFixed(1)}" height="${el.h.toFixed(1)}" preserveAspectRatio="xMidYMid slice" opacity="${opacity}"/>`;
      }
      if (el.kind === 'text') {
        const lines = el.text.split('\n');
        const anchor = el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start';
        const tx = el.align === 'center' ? el.x + el.w / 2 : el.align === 'right' ? el.x + el.w : el.x;
        const lineHeight = el.fontSize * 1.25;
        const startY = el.y + el.fontSize;
        const tspans = lines.map((line, i) =>
          `<tspan x="${tx.toFixed(1)}" y="${(startY + i * lineHeight).toFixed(1)}">${esc(line) || ' '}</tspan>`
        ).join('');
        return `<text text-anchor="${anchor}" font-family="${esc(el.fontFamily)}" font-size="${el.fontSize}" font-weight="${el.fontWeight}" fill="${el.color}" opacity="${opacity}">${tspans}</text>`;
      }
      if (el.kind === 'shape') {
        if (isOutlineShape(el.shape)) {
          const sw = Math.max(1.5, Math.min(el.w, el.h) * 0.025);
          return `<rect x="${el.x.toFixed(1)}" y="${el.y.toFixed(1)}" width="${el.w.toFixed(1)}" height="${el.h.toFixed(1)}" rx="${(el.radius ?? 0).toFixed(1)}" fill="none" stroke="${el.fill}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`;
        }
        if (el.shape === 'circle') {
          const rx = el.w / 2, ry = el.h / 2;
          return `<ellipse cx="${(el.x + rx).toFixed(1)}" cy="${(el.y + ry).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${el.fill}" opacity="${opacity}"/>`;
        }
        if (el.shape === 'rect' || el.shape === 'line') {
          const rx = el.shape === 'rect' ? (el.radius ?? 0) : Math.min(el.h, el.w) / 2;
          return `<rect x="${el.x.toFixed(1)}" y="${el.y.toFixed(1)}" width="${el.w.toFixed(1)}" height="${el.h.toFixed(1)}" rx="${rx.toFixed(1)}" fill="${el.fill}" opacity="${opacity}"/>`;
        }
        const pts = svgPolygonPoints(el.shape, el.x, el.y, el.w, el.h);
        return pts ? `<polygon points="${pts}" fill="${el.fill}" opacity="${opacity}"/>` : '';
      }
      // CTA: background shape + centered label
      let shapeSvg: string;
      let textX: number;
      if (el.style === 'tag') {
        const pts = svgPolygonPoints('tag', el.x, el.y, el.w, el.h);
        shapeSvg = pts ? `<polygon points="${pts}" fill="${el.fill}" opacity="${opacity}"/>` : '';
        textX = el.x + el.w * 0.38;
      } else if (el.style === 'ribbon') {
        shapeSvg = `<polygon points="${svgRibbonPoints(el.x, el.y, el.w, el.h)}" fill="${el.fill}" opacity="${opacity}"/>`;
        textX = el.x + el.w / 2;
      } else {
        shapeSvg = `<rect x="${el.x.toFixed(1)}" y="${el.y.toFixed(1)}" width="${el.w.toFixed(1)}" height="${el.h.toFixed(1)}" rx="${(el.h / 2).toFixed(1)}" fill="${el.fill}" opacity="${opacity}"/>`;
        textX = el.x + el.w / 2;
      }
      const fontSize = Math.max(10, el.h * 0.4);
      const textSvg = `<text x="${textX.toFixed(1)}" y="${(el.y + el.h / 2 + fontSize * 0.32).toFixed(1)}" text-anchor="middle" font-family="Urbanist,Arial,sans-serif" font-weight="700" font-size="${fontSize.toFixed(1)}" fill="${el.textColor}">${esc(el.text)}</text>`;
      return shapeSvg + textSvg;
    }).join('');
}

function renderGenericTemplateSvg(
  template: QrTemplateDefinition,
  options: TemplateRenderOptions,
  overrides: RenderOverrides = {},
): string {
  const { width, height } = template.canvas;
  const short   = Math.min(width, height);
  const qrFrac  = overrides.qr ?? template.qr;
  const qrSize  = qrFrac.size * short;
  const qrX     = qrFrac.x * width;
  const qrY     = qrFrac.y * height;
  const dark     = options.theme === 'dark';
  const vis      = options.visibility ?? {};
  const pairing  = fontPairingFor(options.typography?.pairingId);
  const typeScale = options.typography?.scale ?? 1;

  // A custom background overrides the two-theme default; surface/inner-panel tone still follows
  // the design's theme flag (keeps the card-on-background look consistent either way).
  const background = options.background?.color ?? (dark ? '#1A1410' : '#F5F2EE');
  const foreground = options.background?.ink ?? (dark ? '#F5F2EE' : '#1A1410');
  const surface    = dark ? '#231B16' : '#FFFFFF';
  const markColor  = '#BB9057';

  const qrSvg      = renderBrandedQrSvg(options.destination, options.qrStyle, 900);
  const horizontal = ['landscape', 'ticket', 'label'].includes(template.format);
  const qrOnLeft   = qrX < width / 2;
  const padding    = short * 0.09;
  const inset      = short * 0.055;
  const markH      = short * 0.05;
  const markBaseY  = height - inset * 0.55;

  // Copy block position
  let copy = '';
  if (overrides.copy) {
    const rect = overrides.copy;
    copy = textBlock(template, options, rect.x, rect.y + short * 0.027 * (options.typography?.scale ?? 1), rect.w, horizontal ? 'start' : 'middle');
  } else if (horizontal) {
    const copyX = qrOnLeft
      ? Math.max(width * 0.47, qrX + qrSize + padding * 0.9)
      : padding * 1.15;
    const copyW  = qrOnLeft ? width - copyX - padding * 0.8 : qrX - copyX - padding * 0.8;
    const copyY  = height * 0.26;
    copy = textBlock(template, options, copyX, copyY, copyW, 'start');
  } else {
    const above  = qrY > height * 0.35;
    // Always start below the QR's own bottom edge — a fixed cap here (e.g. height*0.7) can land
    // ABOVE where a large QR actually ends, rendering copy text on top of the QR code.
    const copyY  = above ? height * 0.11 : (qrY + qrSize + short * 0.06);
    copy = textBlock(template, options, width * 0.09, copyY, width * 0.82, 'middle');
  }

  // Round clip for circular format
  const roundClip = template.format === 'round'
    ? `<clipPath id="canvas-clip"><circle cx="${width / 2}" cy="${height / 2}" r="${short / 2}"/></clipPath>`
    : '';
  const clipAttr = template.format === 'round' ? ' clip-path="url(#canvas-clip)"' : '';
  const radius   = template.format === 'tag' ? short * 0.045 : short * 0.018;
  const innerR   = radius * 0.75;

  // Inner surface opacity: slightly higher contrast
  const surfaceOpacity = dark ? '0.44' : '0.72';

  // Gold separator line above merchant name strip
  const separatorY = markBaseY - markH * 1.6;
  const separatorX1 = padding * 0.5;
  const separatorX2 = width - padding * 0.5;

  // Merchant name and separator
  const showMerchant = vis.merchantName !== false && options.merchantName;
  const merchantRect = overrides.merchant;
  const merchantX = merchantRect?.x ?? padding * 0.55;
  const merchantBaseline = merchantRect ? merchantRect.y + merchantRect.h * 0.82 : markBaseY;
  const merchantSvg  = showMerchant
    ? `<line x1="${separatorX1.toFixed(1)}" y1="${separatorY.toFixed(1)}" x2="${separatorX2.toFixed(1)}" y2="${separatorY.toFixed(1)}" stroke="${markColor}" stroke-width="0.5" opacity="0.35"/>` +
      `<text x="${merchantX.toFixed(1)}" y="${merchantBaseline.toFixed(1)}" fill="${foreground}" font-family="${esc(pairing.displayFont)}" font-size="${Math.round(short * 0.034 * typeScale)}">${esc(options.merchantName)}</text>`
    : '';

  // Peshkash brand mark
  const showBrandmark = vis.brandmark !== false;
  const brandmarkRect = overrides.brandmark;
  const brandmarkSvg  = showBrandmark
    ? peshkashLogoImage(brandmarkRect ? brandmarkRect.x + brandmarkRect.w : width - padding * 0.45, brandmarkRect ? brandmarkRect.y + brandmarkRect.h : markBaseY, brandmarkRect?.h ?? markH, dark)
    : '';

  // Paper drop shadow filter
  const shadowY    = (short * 0.01).toFixed(3);
  const shadowBlur = (short * 0.016).toFixed(3);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(template.label)}">` +
    `<defs>` +
    roundClip +
    `<filter id="qr-shadow" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feDropShadow dx="0" dy="${shadowY}" stdDeviation="${shadowBlur}" flood-color="#1A1410" flood-opacity=".14"/>` +
    `</filter>` +
    `</defs>` +
    `<g${clipAttr} style="color:${foreground}">` +
    // Background
    `<rect width="${width}" height="${height}" rx="${radius.toFixed(2)}" fill="${background}"/>` +
    // Inner surface panel
    `<rect x="${(inset * 0.6).toFixed(1)}" y="${(inset * 0.6).toFixed(1)}" width="${(width - inset * 1.2).toFixed(1)}" height="${(height - inset * 1.2).toFixed(1)}" rx="${innerR.toFixed(2)}" fill="${surface}" opacity="${surfaceOpacity}"/>` +
    // Subtle inner border
    `<rect x="${(inset * 0.6).toFixed(1)}" y="${(inset * 0.6).toFixed(1)}" width="${(width - inset * 1.2).toFixed(1)}" height="${(height - inset * 1.2).toFixed(1)}" rx="${innerR.toFixed(2)}" fill="none" stroke="${markColor}" stroke-width="0.6" opacity="0.22"/>` +
    // Corner accent marks
    scanCorners(width, height, markColor) +
    // Backdrop shapes — behind everything else
    renderCanvasElements(options.canvasElements, 'back') +
    // Merchant name strip
    merchantSvg +
    // Brand mark
    brandmarkSvg +
    // QR code
    `<image href="${svgDataUri(qrSvg)}" x="${qrX.toFixed(2)}" y="${qrY.toFixed(2)}" width="${qrSize.toFixed(2)}" height="${qrSize.toFixed(2)}" filter="url(#qr-shadow)"/>` +
    // Copy block
    copy +
    // Foreground shapes / CTA badges — topmost layer, matching the live editor
    renderCanvasElements(options.canvasElements, 'front') +
    `</g></svg>`
  );
}

function renderBrandKitTemplateSvg(
  template: QrTemplateDefinition,
  options: TemplateRenderOptions,
  overrides: RenderOverrides,
): string {
  const { width, height } = template.canvas;
  const short = Math.min(width, height);
  const dark = options.theme === 'dark';
  const bg = options.background?.color ?? (dark ? '#1A1410' : '#F5F2EE');
  const fg = options.background?.ink ?? (dark ? '#F5F2EE' : '#1A1410');
  const muted = dark ? '#C7BEB2' : '#564C40';
  const border = dark ? '#3A302A' : '#E8DBCE';
  const vis = options.visibility ?? {};
  const pairing = fontPairingFor(options.typography?.pairingId);
  const typeScale = options.typography?.scale ?? 1;
  const base = brandKitLayout(template);
  const copyRect = overrides.copy ?? base.copy;
  const dx = copyRect.x - base.copy.x;
  const dy = copyRect.y - base.copy.y;
  const copyWidth = copyRect.w;
  const qr = overrides.qr ?? template.qr;
  const qrSize = qr.size * short;
  const qrX = qr.x * width;
  const qrY = qr.y * height;
  const qrSvg = renderBrandedQrSvg(options.destination, options.qrStyle, 900);

  const eyebrow = (x: number, y: number, anchor: 'start' | 'middle' = 'start') => vis.eyebrow === false || !options.eyebrow ? ''
    : `<text x="${x + dx}" y="${y + dy}" text-anchor="${anchor}" font-family="${esc(pairing.bodyFont)}" font-size="${15 * typeScale}" font-weight="700" letter-spacing="${4.6 * typeScale}" fill="${BRASS}">${esc(options.eyebrow.toUpperCase())}</text>`;
  const headline = (x: number, y: number, size: number, anchor: 'start' | 'middle' = 'start') => vis.headline === false || !options.headline ? ''
    : liveTextLines(options.headline, x + dx, y + dy, copyWidth, size * typeScale, fg, pairing.displayFont, anchor);
  const descriptor = (x: number, y: number, size: number, anchor: 'start' | 'middle' = 'start') => vis.descriptor === false || !options.descriptor ? ''
    : `<text x="${x + dx}" y="${y + dy}" text-anchor="${anchor}" font-family="${esc(pairing.bodyFont)}" font-size="${size * typeScale}" fill="${muted}">${esc(options.descriptor)}</text>`;
  const cta = (x: number, y: number, size: number, anchor: 'start' | 'middle' = 'start') => vis.cta === false || !options.cta ? ''
    : `<text x="${x + dx}" y="${y + dy}" text-anchor="${anchor}" font-family="${esc(pairing.bodyFont)}" font-size="${size * typeScale}" font-weight="700" letter-spacing="${1.5 * typeScale}" fill="${fg}">${esc(options.cta.toUpperCase())}</text>`;

  let structure = '';
  let copy = '';
  let logo = '';
  switch (template.format) {
    case 'landscape': {
      const qrLeft = template.qr.x * width < width / 2;
      const tx = qrLeft ? 548 : 78;
      structure = `<rect width="1200" height="700" rx="28" fill="${bg}"/><rect x="24" y="24" width="1152" height="652" rx="18" fill="none" stroke="${border}" stroke-width="2"/><path d="M0 0H18V700H0Z" fill="${BRASS}"/>`;
      copy = eyebrow(tx, 98) + headline(tx, 205, 50) + descriptor(tx, 350, 21) + `<path d="M${tx + dx} ${400 + dy}H${tx + dx + Math.min(390, copyWidth)}" stroke="${BRASS}" stroke-width="2"/>` + cta(tx, 458, 18);
      logo = brandLogo(tx, 510, 300, dark);
      break;
    }
    case 'portrait':
      structure = `<rect width="800" height="1200" rx="32" fill="${bg}"/><rect x="28" y="28" width="744" height="1144" rx="20" fill="none" stroke="${border}" stroke-width="2"/>`;
      copy = eyebrow(400, 105, 'middle') + headline(400, 202, 48, 'middle') + descriptor(400, 315, 18, 'middle') + cta(400, 870, 22, 'middle') + `<path d="M${275 + dx} ${930 + dy}H${525 + dx}" stroke="${BRASS}" stroke-width="2"/>`;
      logo = brandLogo(250, 968, 300, dark);
      break;
    case 'tag':
      structure = `<rect width="600" height="1080" rx="26" fill="${bg}"/><circle cx="300" cy="60" r="18" fill="${fg}"/><path d="M68 110H532" stroke="${border}" stroke-width="2"/>`;
      copy = eyebrow(300, 170, 'middle') + headline(300, 245, 40, 'middle') + descriptor(300, 320, 16, 'middle') + cta(300, 770, 20, 'middle') + `<path d="M${190 + dx} ${826 + dy}H${410 + dx}" stroke="${BRASS}" stroke-width="2"/>`;
      logo = brandLogo(150, 855, 300, dark);
      break;
    case 'square':
      structure = `<rect width="800" height="800" rx="32" fill="${bg}"/><path d="M55 55H220M580 55H745M55 745H220M580 745H745" stroke="${BRASS}" stroke-width="3"/>`;
      copy = eyebrow(400, 105, 'middle') + headline(400, 170, 39, 'middle') + cta(400, 635, 20, 'middle') + descriptor(400, 676, 16, 'middle');
      logo = brandLogo(285, 688, 230, dark);
      break;
    case 'round':
      structure = `<circle cx="450" cy="450" r="438" fill="${bg}"/><circle cx="450" cy="450" r="408" fill="none" stroke="${BRASS}" stroke-width="3"/>`;
      copy = eyebrow(450, 110, 'middle') + headline(450, 175, 38, 'middle') + cta(450, 660, 19, 'middle') + descriptor(450, 700, 16, 'middle');
      logo = brandLogo(335, 710, 230, dark);
      break;
    case 'insert':
      structure = `<rect width="800" height="1000" rx="30" fill="${bg}"/><rect x="28" y="28" width="744" height="944" rx="18" fill="none" stroke="${border}" stroke-width="2"/>`;
      copy = eyebrow(400, 105, 'middle') + headline(400, 190, 46, 'middle') + descriptor(400, 280, 18, 'middle') + cta(400, 760, 21, 'middle') + `<path d="M${280 + dx} ${820 + dy}H${520 + dx}" stroke="${BRASS}" stroke-width="2"/>`;
      logo = brandLogo(250, 845, 300, dark);
      break;
    case 'ticket':
      structure = `<rect width="1200" height="500" rx="24" fill="${bg}"/><rect x="18" y="18" width="1164" height="464" rx="15" fill="none" stroke="${border}" stroke-width="2"/><path d="M790 30V470" stroke="${BRASS}" stroke-width="2" stroke-dasharray="8 10"/>`;
      copy = eyebrow(62, 92) + headline(62, 185, 50) + descriptor(64, 302, 20) + cta(64, 370, 18);
      logo = brandLogo(62, 390, 260, dark);
      break;
    case 'label': {
      const qrLeft = template.qr.x * width < width / 2;
      const tx = qrLeft ? 500 : 72;
      structure = `<rect width="1200" height="700" rx="18" fill="${bg}"/><rect x="24" y="24" width="1152" height="652" rx="10" fill="none" stroke="${border}" stroke-width="2"/>`;
      copy = eyebrow(tx, 105) + headline(tx, 215, 48) + descriptor(tx, 350, 20) + `<path d="M${tx + dx} ${405 + dy}H${tx + dx + Math.min(390, copyWidth)}" stroke="${BRASS}" stroke-width="2"/>` + cta(tx, 468, 18);
      logo = brandLogo(tx, 505, 280, dark);
      break;
    }
  }

  const brandRect = overrides.brandmark;
  const brandIsCanonical = !brandRect || (
    Math.abs(brandRect.x - base.brandmark.x) < 0.01
    && Math.abs(brandRect.y - base.brandmark.y) < 0.01
    && Math.abs(brandRect.w - base.brandmark.w) < 0.01
    && Math.abs(brandRect.h - base.brandmark.h) < 0.01
  );
  if (vis.brandmark === false) logo = '';
  else if (brandRect && !brandIsCanonical) logo = peshkashLogoImage(brandRect.x + brandRect.w, brandRect.y + brandRect.h, brandRect.h, dark);

  const merchantRect = overrides.merchant ?? base.merchant;
  const merchant = vis.merchantName === false || !options.merchantName ? ''
    : `<text x="${merchantRect.x}" y="${merchantRect.y + merchantRect.h * 0.82}" font-family="${esc(pairing.displayFont)}" font-size="${Math.max(11, short * 0.027 * typeScale)}" fill="${fg}" opacity=".82">${esc(options.merchantName)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(template.label)}"><g>${structure}${renderCanvasElements(options.canvasElements, 'back')}${merchant}${logo}<image href="${svgDataUri(qrSvg)}" x="${qrX.toFixed(2)}" y="${qrY.toFixed(2)}" width="${qrSize.toFixed(2)}" height="${qrSize.toFixed(2)}"/>${copy}${renderCanvasElements(options.canvasElements, 'front')}</g></svg>`;
}

export function renderTemplateSvg(
  template: QrTemplateDefinition,
  options: TemplateRenderOptions,
  overrides: RenderOverrides = {},
): string {
  return template.id.startsWith('custom-')
    ? renderGenericTemplateSvg(template, options, overrides)
    : renderBrandKitTemplateSvg(template, options, overrides);
}
