import QRCode from 'qrcode';

export const BASE_SCALE = 3.78;
export const EXPORT_DPI = 300;
export const EXPORT_SCALE = EXPORT_DPI / 25.4; // ~11.811 px/mm

export interface PrintTemplate {
  id?: number;
  name: string;
  widthMm: number;
  heightMm: number;
  elements: any[];
}

/**
 * Draws the Peshkash origami-P mark centred at (cx, cy).
 * `size` is the height of the mark in canvas pixels.
 *
 * SVG source coords: P bbox x=[335,516] y=[164,415], center=(425.5,289.5)
 * Non-editable — used on all exported QR codes.
 */
export function drawPeshkashMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const scale = size / 251;            // 251 = height of bbox
  const ox = cx - 425.5 * scale;      // shift SVG origin to canvas centre
  const oy = cy - 289.5 * scale;
  function sx(v: number) { return ox + v * scale; }
  function sy(v: number) { return oy + v * scale; }

  ctx.save();

  // White disc — hides QR modules beneath the mark
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Cream face (top triangle)
  ctx.beginPath();
  ctx.moveTo(sx(391.5), sy(164));
  ctx.lineTo(sx(471),   sy(164));
  ctx.lineTo(sx(516),   sy(205));
  ctx.lineTo(sx(391.5), sy(276.5));
  ctx.closePath();
  ctx.fillStyle = '#E8DBCE';
  ctx.fill();

  // Mid-tone face (right)
  ctx.beginPath();
  ctx.moveTo(sx(516),   sy(205));
  ctx.lineTo(sx(516),   sy(262.5));
  ctx.lineTo(sx(470.5), sy(310));
  ctx.lineTo(sx(391.5), sy(276.5));
  ctx.closePath();
  ctx.fillStyle = '#C5AF9D';
  ctx.fill();

  // Dark bottom fold
  ctx.beginPath();
  ctx.moveTo(sx(391.5), sy(276.5));
  ctx.lineTo(sx(470.5), sy(310));
  ctx.lineTo(sx(391.5), sy(310));
  ctx.closePath();
  ctx.fillStyle = '#8C7667';
  ctx.fill();

  // Gold P stem
  ctx.beginPath();
  ctx.moveTo(sx(335), sy(164));
  ctx.lineTo(sx(392), sy(164));
  ctx.lineTo(sx(392), sy(415));
  ctx.lineTo(sx(364), sy(389));
  ctx.lineTo(sx(335), sy(415));
  ctx.closePath();
  ctx.fillStyle = '#BB9057';
  ctx.fill();

  ctx.restore();
}

/**
 * Renders a QR template to a canvas at 300 DPI.
 *
 * Every QR element gets a Peshkash icon centred on it (non-editable).
 * A branded footer strip ("powered by peshkash") is appended below the
 * template, extending the canvas height by ~6 mm.
 */
export async function renderTemplateToCanvas(
  canvas: HTMLCanvasElement,
  template: PrintTemplate,
  qrValue: string,
): Promise<void> {
  const pw = Math.round(template.widthMm * EXPORT_SCALE);
  const ph = Math.round(template.heightMm * EXPORT_SCALE);
  const FOOTER_H = Math.round(6 * EXPORT_SCALE); // 6 mm footer strip

  canvas.width  = pw;
  canvas.height = ph + FOOTER_H;

  const ctx = canvas.getContext('2d')!;

  // ── Template background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pw, ph);

  // ── Template elements
  for (const el of template.elements) {
    if (!el) continue;
    const ex = el.x * EXPORT_SCALE;
    const ey = el.y * EXPORT_SCALE;
    const ew = el.width  * EXPORT_SCALE;
    const eh = el.height * EXPORT_SCALE;

    ctx.save();
    ctx.globalAlpha = typeof el.opacity === 'number' ? el.opacity : 1;

    if (el.type === 'rect') {
      const br = (el.borderRadius || 0) * EXPORT_SCALE;
      ctx.beginPath();
      ctx.roundRect(ex, ey, ew, eh, br);
      ctx.fillStyle = el.fill || '#fff';
      ctx.fill();
      if ((el.strokeWidth || 0) > 0) {
        ctx.strokeStyle = el.stroke || '#000';
        ctx.lineWidth = el.strokeWidth * EXPORT_SCALE;
        ctx.stroke();
      }

    } else if (el.type === 'text') {
      const fs = el.fontSize * (EXPORT_SCALE / BASE_SCALE);
      ctx.font = `${el.fontWeight || '400'} ${fs}px ${el.fontFamily || 'Inter'}, sans-serif`;
      ctx.fillStyle = el.color || '#000';
      ctx.textAlign = el.textAlign || 'left';
      ctx.textBaseline = 'middle';
      const tx =
        el.textAlign === 'center' ? ex + ew / 2 :
        el.textAlign === 'right'  ? ex + ew      : ex;
      ctx.fillText(el.content || '', tx, ey + eh / 2, ew);

    } else if (el.type === 'image' && el.src) {
      await new Promise<void>(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => { ctx.drawImage(img, ex, ey, ew, eh); resolve(); };
        img.onerror = () => resolve();
        img.src = el.src;
      });

    } else if (el.type === 'qr') {
      const qCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qCanvas, qrValue || 'https://peshkash.app', {
        width: ew,
        margin: el.margin ?? 1,
        color: {
          dark:  el.fgColor || '#000000',
          light: el.bgColor === 'transparent' ? '#ffffff' : (el.bgColor || '#ffffff'),
        },
        errorCorrectionLevel: 'H', // required to safely overlay logo
      });

      const br = (el.borderRadius || 0) * EXPORT_SCALE;
      if (br > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(ex, ey, ew, eh, br);
        ctx.clip();
      }
      ctx.drawImage(qCanvas, ex, ey, ew, eh);
      if (br > 0) ctx.restore();

      // Non-editable Peshkash mark centred on the QR
      ctx.globalAlpha = 1;
      drawPeshkashMark(ctx, ex + ew / 2, ey + eh / 2, ew * 0.22);
    }

    ctx.restore();
  }

  // ── Branded footer — no separator, right-aligned one line
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f5f1eb';
  ctx.fillRect(0, ph, pw, FOOTER_H);

  const fCY      = ph + FOOTER_H / 2;
  const rightEdge = pw - Math.round(FOOTER_H * 0.45);
  const markH2   = FOOTER_H * 0.50;
  const iconGap  = Math.round(markH2 * 0.28);

  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'right';

  ctx.font      = `600 ${Math.round(FOOTER_H * 0.40)}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = '#BD945A';
  const wmW = ctx.measureText('peshkash').width;
  ctx.fillText('peshkash', rightEdge, fCY);

  const markCX2 = rightEdge - wmW - iconGap - markH2 * 0.5;
  drawPeshkashMark(ctx, markCX2, fCY, markH2);

  ctx.font      = `400 ${Math.round(FOOTER_H * 0.28)}px Arial, sans-serif`;
  ctx.fillStyle = '#9a8870';
  ctx.textAlign = 'right';
  ctx.fillText('powered by', markCX2 - markH2 * 0.5 - iconGap, fCY);
}
