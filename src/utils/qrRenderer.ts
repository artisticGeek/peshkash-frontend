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

export async function renderTemplateToCanvas(
  canvas: HTMLCanvasElement,
  template: PrintTemplate,
  qrValue: string,
): Promise<void> {
  const pw = Math.round(template.widthMm * EXPORT_SCALE);
  const ph = Math.round(template.heightMm * EXPORT_SCALE);
  canvas.width = pw;
  canvas.height = ph;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pw, ph);

  for (const el of template.elements) {
    if (!el) continue;
    const ex = el.x * EXPORT_SCALE;
    const ey = el.y * EXPORT_SCALE;
    const ew = el.width * EXPORT_SCALE;
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
        img.onload = () => { ctx.drawImage(img, ex, ey, ew, eh); resolve(); };
        img.onerror = () => resolve();
        img.src = el.src;
      });
    } else if (el.type === 'qr') {
      const qCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qCanvas, qrValue || 'https://peshkash.com', {
        width: ew,
        margin: el.margin ?? 1,
        color: {
          dark: el.fgColor || '#000000',
          light: el.bgColor === 'transparent' ? '#ffffff' : (el.bgColor || '#ffffff'),
        },
        errorCorrectionLevel: el.errorLevel || 'M',
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
    }
    ctx.restore();
  }
}
