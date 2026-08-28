import { renderBrandedQrSvg, svgDataUri } from './qrRenderer';
import { svgPolygonPoints, svgRibbonPoints, isOutlineShape, fontPairingFor } from './elementPresets';
import type { QrTemplateDefinition, StudioContent, StudioTheme, QrStyleId, ElementVisibility, CanvasElement, BackgroundSpec, ElementLayer, TypographySpec } from './types';

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
}

function esc(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[char] ?? char);
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

export function renderTemplateSvg(
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
  if (horizontal) {
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
  const merchantSvg  = showMerchant
    ? `<line x1="${separatorX1.toFixed(1)}" y1="${separatorY.toFixed(1)}" x2="${separatorX2.toFixed(1)}" y2="${separatorY.toFixed(1)}" stroke="${markColor}" stroke-width="0.5" opacity="0.35"/>` +
      `<text x="${(padding * 0.55).toFixed(1)}" y="${markBaseY.toFixed(1)}" fill="${foreground}" font-family="${esc(pairing.displayFont)}" font-size="${Math.round(short * 0.034 * typeScale)}">${esc(options.merchantName)}</text>`
    : '';

  // Peshkash brand mark
  const showBrandmark = vis.brandmark !== false;
  const brandmarkSvg  = showBrandmark ? peshkashLogoImage(width - padding * 0.45, markBaseY, markH, dark) : '';

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
