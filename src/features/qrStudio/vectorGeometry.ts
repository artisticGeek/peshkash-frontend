function n(value: number): string {
  return Number(value.toFixed(4)).toString();
}

/** Closed cubic contour that imports into illustration software as real curves. */
export function roundedBoxCurvePath(x: number, y: number, width: number, height: number, radius: number, reverse = false): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (!r) return reverse
    ? `M${n(x)} ${n(y)}V${n(y + height)}H${n(x + width)}V${n(y)}Z`
    : `M${n(x)} ${n(y)}H${n(x + width)}V${n(y + height)}H${n(x)}Z`;
  const k = r * 0.5522847498307936;
  if (reverse) {
    return `M${n(x + r)} ${n(y)}C${n(x + r - k)} ${n(y)} ${n(x)} ${n(y + r - k)} ${n(x)} ${n(y + r)}V${n(y + height - r)}C${n(x)} ${n(y + height - r + k)} ${n(x + r - k)} ${n(y + height)} ${n(x + r)} ${n(y + height)}H${n(x + width - r)}C${n(x + width - r + k)} ${n(y + height)} ${n(x + width)} ${n(y + height - r + k)} ${n(x + width)} ${n(y + height - r)}V${n(y + r)}C${n(x + width)} ${n(y + r - k)} ${n(x + width - r + k)} ${n(y)} ${n(x + width - r)} ${n(y)}Z`;
  }
  return `M${n(x + r)} ${n(y)}H${n(x + width - r)}C${n(x + width - r + k)} ${n(y)} ${n(x + width)} ${n(y + r - k)} ${n(x + width)} ${n(y + r)}V${n(y + height - r)}C${n(x + width)} ${n(y + height - r + k)} ${n(x + width - r + k)} ${n(y + height)} ${n(x + width - r)} ${n(y + height)}H${n(x + r)}C${n(x + r - k)} ${n(y + height)} ${n(x)} ${n(y + height - r + k)} ${n(x)} ${n(y + height - r)}V${n(y + r)}C${n(x)} ${n(y + r - k)} ${n(x + r - k)} ${n(y)} ${n(x + r)} ${n(y)}Z`;
}

export function roundedRectCurvePath(x: number, y: number, width: number, radius: number, reverse = false): string {
  return roundedBoxCurvePath(x, y, width, width, radius, reverse);
}

export function circleCurvePath(cx: number, cy: number, radius: number): string {
  const k = radius * 0.5522847498307936;
  return `M${n(cx)} ${n(cy - radius)}C${n(cx + k)} ${n(cy - radius)} ${n(cx + radius)} ${n(cy - k)} ${n(cx + radius)} ${n(cy)}C${n(cx + radius)} ${n(cy + k)} ${n(cx + k)} ${n(cy + radius)} ${n(cx)} ${n(cy + radius)}C${n(cx - k)} ${n(cy + radius)} ${n(cx - radius)} ${n(cy + k)} ${n(cx - radius)} ${n(cy)}C${n(cx - radius)} ${n(cy - k)} ${n(cx - k)} ${n(cy - radius)} ${n(cx)} ${n(cy - radius)}Z`;
}
