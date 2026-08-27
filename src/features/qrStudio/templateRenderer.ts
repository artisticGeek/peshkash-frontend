import { renderBrandedQrSvg, svgDataUri } from './qrRenderer';
import type { QrTemplateDefinition, StudioContent, StudioTheme, QrStyleId } from './types';

export interface TemplateRenderOptions extends StudioContent {
  qrStyle: QrStyleId;
  theme: StudioTheme;
}

export interface RenderOverrides {
  qr?: { x: number; y: number; size: number };
}

function esc(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[char] ?? char);
}

function textBlock(template: QrTemplateDefinition, options: TemplateRenderOptions, x: number, y: number, width: number, align: 'start' | 'middle' = 'start'): string {
  const scale = Math.min(template.canvas.width, template.canvas.height);
  const anchor = align === 'middle' ? 'middle' : 'start';
  const tx = align === 'middle' ? x + width / 2 : x;
  return `<g fill="currentColor" text-anchor="${anchor}">` +
    `<text x="${tx}" y="${y}" font-family="Urbanist,Arial,sans-serif" font-size="${Math.round(scale * 0.027)}" font-weight="700" letter-spacing="${Math.round(scale * 0.006)}">${esc(options.eyebrow.toUpperCase())}</text>` +
    `<text x="${tx}" y="${y + scale * 0.09}" font-family="Rufina,Georgia,serif" font-size="${Math.round(scale * 0.071)}" font-weight="500">${esc(options.headline)}</text>` +
    `<text x="${tx}" y="${y + scale * 0.15}" font-family="Urbanist,Arial,sans-serif" font-size="${Math.round(scale * 0.032)}" opacity=".72">${esc(options.descriptor)}</text>` +
    `<text x="${tx}" y="${y + scale * 0.23}" font-family="Urbanist,Arial,sans-serif" font-size="${Math.round(scale * 0.026)}" font-weight="700" letter-spacing="${Math.round(scale * 0.004)}" fill="#BB9057">${esc(options.cta.toUpperCase())}  →</text>` +
    `</g>`;
}

function scanCorners(width: number, height: number, color: string): string {
  const inset = Math.min(width, height) * 0.055;
  const arm = Math.min(width, height) * 0.08;
  const sw = Math.max(3, Math.min(width, height) * 0.006);
  return `<g fill="none" stroke="${color}" stroke-width="${sw}" opacity=".8">` +
    `<path d="M${inset + arm} ${inset}H${inset}V${inset + arm}"/>` +
    `<path d="M${width - inset - arm} ${inset}H${width - inset}V${inset + arm}"/>` +
    `<path d="M${inset} ${height - inset - arm}V${height - inset}H${inset + arm}"/>` +
    `<path d="M${width - inset - arm} ${height - inset}H${width - inset}V${height - inset - arm}"/>` +
    `</g>`;
}

// Brand kit logo: viewBox 0 0 1536 512, visual content x:[335,1312] y:[164,415]
// Positions the actual vector logo so its content right-bottom aligns to (rightX, bottomY)
function peshkashLogoImage(rightX: number, bottomY: number, logoH: number, dark: boolean): string {
  const svgW = 1536, svgH = 512;
  const cx2 = 1312, cy2 = 415, contentH = cy2 - 164; // 251
  const scale = logoH / contentH;
  const imgW = svgW * scale;
  const imgH = svgH * scale;
  const imgX = rightX - cx2 * scale;
  const imgY = bottomY - cy2 * scale;
  const href = dark ? '/brand/peshkash-logo-dark.svg' : '/brand/peshkash-logo-light.svg';
  return `<image href="${href}" x="${imgX}" y="${imgY}" width="${imgW}" height="${imgH}"/>`;
}

export function renderTemplateSvg(template: QrTemplateDefinition, options: TemplateRenderOptions, overrides: RenderOverrides = {}): string {
  const { width, height } = template.canvas;
  const short = Math.min(width, height);
  const qrFrac = overrides.qr ?? template.qr;
  const qrSize = qrFrac.size * short;
  const qrX = qrFrac.x * width;
  const qrY = qrFrac.y * height;
  const dark = options.theme === 'dark';
  const background = dark ? '#1A1410' : '#F5F2EE';
  const foreground = dark ? '#F5F2EE' : '#1A1410';
  const surface = dark ? '#241C17' : '#FFFFFF';
  const markColor = '#BB9057';
  const qrSvg = renderBrandedQrSvg(options.destination, options.qrStyle, 900);
  const horizontal = template.format === 'landscape' || template.format === 'ticket' || template.format === 'label';
  const qrOnLeft = qrX < width / 2;
  const padding = short * 0.09;
  const markH = short * 0.055;
  const markBaseY = height - padding * 0.22;

  let copy: string;
  if (horizontal) {
    const copyX = qrOnLeft ? Math.max(width * 0.47, qrX + qrSize + padding) : padding * 1.2;
    const copyW = qrOnLeft ? width - copyX - padding : qrX - copyX - padding;
    copy = textBlock(template, options, copyX, height * 0.28, copyW);
  } else {
    const above = qrY > height * 0.35;
    const copyY = above ? height * 0.14 : Math.min(height * 0.72, qrY + qrSize + short * 0.07);
    copy = textBlock(template, options, width * 0.09, copyY, width * 0.82, 'middle');
  }

  const roundClip = template.format === 'round'
    ? `<clipPath id="canvas-clip"><circle cx="${width / 2}" cy="${height / 2}" r="${short / 2}"/></clipPath>`
    : '';
  const clipAttr = template.format === 'round' ? ' clip-path="url(#canvas-clip)"' : '';
  const radius = template.format === 'tag' ? short * 0.045 : short * 0.018;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(template.label)}">` +
    `<defs>${roundClip}<filter id="paper-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="${short * 0.012}" stdDeviation="${short * 0.018}" flood-color="#1A1410" flood-opacity=".12"/></filter></defs>` +
    `<g${clipAttr} style="color:${foreground}">` +
    `<rect width="${width}" height="${height}" rx="${radius}" fill="${background}"/>` +
    `<rect x="${padding * 0.55}" y="${padding * 0.55}" width="${width - padding * 1.1}" height="${height - padding * 1.1}" rx="${radius}" fill="${surface}" opacity="${dark ? '.42' : '.68'}"/>` +
    scanCorners(width, height, markColor) +
    `<text x="${padding}" y="${markBaseY}" fill="${foreground}" font-family="Rufina,Georgia,serif" font-size="${Math.round(short * 0.034)}">${esc(options.merchantName)}</text>` +
    `<image href="${svgDataUri(qrSvg)}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" filter="url(#paper-shadow)"/>` +
    copy +
    peshkashLogoImage(width - padding * 0.5, markBaseY, markH, dark) +
    `</g></svg>`;
}
