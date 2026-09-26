import QRCode from 'qrcode';
import { qrManifest, type QrColorSpec, type QrStyleId } from './types';

interface QrMatrix {
  size: number;
  data: Uint8Array | boolean[];
}

const INK = '#1A1410';
const PAPER = '#FFFFFF';
const BRASS = '#BB9057';
const CREAM = '#E8DBCE';
const STONE = '#C5AF9D';
const FOLD = '#8C7667';

export const DEFAULT_QR_COLORS: QrColorSpec = {
  foreground: INK,
  background: PAPER,
  accent: BRASS,
  transparent: false,
};

function esc(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;',
  })[char] ?? char);
}

function roundedRectPath(x: number, y: number, width: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2));
  return `M${(x + r).toFixed(3)} ${y.toFixed(3)}H${(x + width - r).toFixed(3)}A${r.toFixed(3)} ${r.toFixed(3)} 0 0 1 ${(x + width).toFixed(3)} ${(y + r).toFixed(3)}V${(y + width - r).toFixed(3)}A${r.toFixed(3)} ${r.toFixed(3)} 0 0 1 ${(x + width - r).toFixed(3)} ${(y + width).toFixed(3)}H${(x + r).toFixed(3)}A${r.toFixed(3)} ${r.toFixed(3)} 0 0 1 ${x.toFixed(3)} ${(y + width - r).toFixed(3)}V${(y + r).toFixed(3)}A${r.toFixed(3)} ${r.toFixed(3)} 0 0 1 ${(x + r).toFixed(3)} ${y.toFixed(3)}Z`;
}

function matrixFor(value: string, maskPattern?: number): QrMatrix {
  const qr = QRCode.create(value || 'https://peshkash.app', {
    errorCorrectionLevel: 'H',
    ...(maskPattern == null ? {} : { maskPattern }),
  } as QRCode.QRCodeOptions) as unknown as { modules: QrMatrix };
  return qr.modules;
}

function isFinder(row: number, col: number, size: number): boolean {
  return (row < 7 && col < 7)
    || (row < 7 && col >= size - 7)
    || (row >= size - 7 && col < 7);
}

function centreDamage(matrix: QrMatrix, ratio: number): number {
  const centre = (matrix.size - 1) / 2;
  const radius = matrix.size * ratio * 0.62;
  let damage = 0;
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      const dark = Boolean(matrix.data[row * matrix.size + col]);
      if (!dark) continue;
      const dx = col - centre;
      const dy = row - centre;
      if ((dx * dx) + (dy * dy) <= radius * radius) damage += 1;
    }
  }
  return damage;
}

function selectMatrix(value: string, styleId: QrStyleId): QrMatrix {
  if (styleId !== 'obsidian-ring') return matrixFor(value);
  const ratio = qrManifest.qrStyles[styleId].medallionRatio;
  let best = matrixFor(value, 0);
  let bestDamage = centreDamage(best, ratio);
  for (let mask = 1; mask < 8; mask += 1) {
    const candidate = matrixFor(value, mask);
    const damage = centreDamage(candidate, ratio);
    if (damage < bestDamage) {
      best = candidate;
      bestDamage = damage;
    }
  }
  return best;
}

function peshkashMark(cx: number, cy: number, diameter: number, lightIcon: boolean): string {
  const scale = diameter / 380;
  const x = cx - (180 * scale);
  const y = cy - (190 * scale);
  const corner = lightIcon ? '#F5F2EE' : BRASS;
  const top = lightIcon ? '#F5F2EE' : CREAM;
  return `<g transform="translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${scale.toFixed(6)})">
    <g fill="none" stroke="${corner}" stroke-width="7" stroke-linecap="square" stroke-linejoin="miter">
      <path d="M62 26.5H22V67"/><path d="M296 26.5H335V67"/>
      <path d="M22 316V357H62"/><path d="M296 357H335V316"/>
    </g>
    <path d="M156.5 69H236L281 110L156.5 181.5Z" fill="${top}"/>
    <path d="M281 110V167.5L235.5 215L156.5 181.5Z" fill="${STONE}"/>
    <path d="M156.5 181.5L235.5 215H156.5Z" fill="${FOLD}"/>
    <path d="M100 69H157V320L129 294L100 320Z" fill="${BRASS}"/>
  </g>`;
}

export function renderBrandedQrSvg(
  value: string,
  styleId: QrStyleId,
  pixelSize = 900,
  colorOptions: Partial<QrColorSpec> = {},
): string {
  const style = qrManifest.qrStyles[styleId];
  const colors: QrColorSpec = { ...DEFAULT_QR_COLORS, ...colorOptions };
  const matrix = selectMatrix(value, styleId);
  const quiet = qrManifest.qrStandard.quietZoneModules;
  const total = matrix.size + (quiet * 2);
  const cell = pixelSize / total;
  const moduleRadius = cell * style.moduleRadiusCells;
  const finderRadius = cell * style.finderRadiusCells;
  const paths: string[] = [];

  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (isFinder(row, col, matrix.size) || !matrix.data[row * matrix.size + col]) continue;
      const x = (col + quiet) * cell;
      const y = (row + quiet) * cell;
      paths.push(`<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${cell.toFixed(3)}" height="${cell.toFixed(3)}" rx="${moduleRadius.toFixed(3)}" fill="${colors.foreground}"/>`);
    }
  }

  const finderOrigins: Array<[number, number]> = [
    [quiet, quiet], [quiet + matrix.size - 7, quiet], [quiet, quiet + matrix.size - 7],
  ];
  finderOrigins.forEach(([col, row]) => {
    const x = col * cell;
    const y = row * cell;
    const outerW = 7 * cell;
    const innerX = x + cell;
    const innerY = y + cell;
    const innerW = 5 * cell;
    const outerPath = roundedRectPath(x, y, outerW, finderRadius);
    const innerPath = roundedRectPath(innerX, innerY, innerW, Math.max(0, finderRadius - cell));
    paths.push(`<path d="${outerPath} ${innerPath}" fill="${colors.foreground}" fill-rule="evenodd"/>`);
    paths.push(`<circle cx="${(x + (3.5 * cell)).toFixed(3)}" cy="${(y + (3.5 * cell)).toFixed(3)}" r="${(1.5 * cell).toFixed(3)}" fill="${colors.accent || style.finderCore}"/>`);
  });

  const centre = pixelSize / 2;
  const diameter = pixelSize * style.medallionRatio;
  const stroke = Math.max(2, pixelSize * 0.004);
  const medallion: string[] = [];
  if (styleId === 'obsidian-ring') {
    medallion.push(`<circle cx="${centre}" cy="${centre}" r="${(diameter * 0.58).toFixed(3)}" fill="${PAPER}"/>`);
  }
  medallion.push(`<circle cx="${centre}" cy="${centre}" r="${(diameter / 2).toFixed(3)}" fill="${style.medallionFill}" stroke="${style.medallionStroke}" stroke-width="${stroke.toFixed(3)}"/>`);
  medallion.push(peshkashMark(centre, centre, diameter * style.medallionIconRatio, styleId === 'obsidian-ring'));

  const background = colors.transparent ? '' : `<rect width="${pixelSize}" height="${pixelSize}" fill="${colors.background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${pixelSize} ${pixelSize}" role="img" aria-label="Peshkash branded QR code">${background}${paths.join('')}${medallion.join('')}</svg>`;
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function qrAccessibleLabel(destination: string): string {
  return `QR code linking to ${esc(destination)}`;
}

