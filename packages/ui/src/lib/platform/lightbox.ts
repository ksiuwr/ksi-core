/**
 * Pure state & math helpers for the Lightbox component. Everything here is
 * side-effect free so the zoom/pan/navigation behaviour can be unit-tested
 * without a DOM. Coordinates are always relative to the stage center: the
 * image is centered, then translated by `{ x, y }` and scaled by `scale`.
 */

export type LightboxItem = { src: string; alt?: string; description?: string };
export type LightboxSize = { width: number; height: number };
export type LightboxPoint = { x: number; y: number };
export type LightboxView = { scale: number; x: number; y: number };

export const LIGHTBOX_MIN_ZOOM = 1;
export const LIGHTBOX_MAX_ZOOM = 4;
export const LIGHTBOX_ZOOM_STEP = 0.5;
export const LIGHTBOX_DOUBLE_TAP_ZOOM = 2.5;
export const LIGHTBOX_SLIDE_GAP = 24;

/** Wraps any integer index into `[0, total)`; returns 0 for empty galleries. */
export function wrapLightboxIndex(index: number, total: number): number {
  if (!Number.isFinite(index) || !Number.isFinite(total) || total <= 0) return 0;
  const count = Math.floor(total);
  const wrapped = ((Math.trunc(index) % count) + count) % count;
  return wrapped;
}

/** Clamps a zoom scale, falling back to the minimum for non-finite input. */
export function clampZoom(
  scale: number,
  min: number = LIGHTBOX_MIN_ZOOM,
  max: number = LIGHTBOX_MAX_ZOOM
): number {
  const lo = Number.isFinite(min) ? min : LIGHTBOX_MIN_ZOOM;
  const hi = Number.isFinite(max) ? max : LIGHTBOX_MAX_ZOOM;
  if (!Number.isFinite(scale)) return lo;
  return Math.min(Math.max(scale, lo), hi);
}

/**
 * Steps zoom in/out on a clean `step` grid (1 → 1.5 → 2 …) so repeated
 * stepping never accumulates floating-point drift, then clamps the result.
 */
export function stepZoom(
  scale: number,
  direction: 1 | -1,
  step: number = LIGHTBOX_ZOOM_STEP
): number {
  const delta = Number.isFinite(step) && step > 0 ? step : LIGHTBOX_ZOOM_STEP;
  const base = Number.isFinite(scale) ? scale : LIGHTBOX_MIN_ZOOM;
  const snapped = Math.round((base + direction * delta) / delta) * delta;
  return clampZoom(Math.round(snapped * 1e6) / 1e6);
}

/**
 * Keeps a zoomed image reachable: each axis is clamped to
 * `±(scaledSize - viewportSize) / 2`, and axes where the scaled content fits
 * inside the viewport (or scale <= 1) are pinned to 0.
 */
export function clampPan(
  pan: LightboxPoint,
  scale: number,
  content: LightboxSize,
  viewport: LightboxSize
): LightboxPoint {
  const safeScale = Number.isFinite(scale) ? scale : LIGHTBOX_MIN_ZOOM;
  if (safeScale <= 1) return { x: 0, y: 0 };
  const limit = (size: number, view: number) => {
    const scaled = size * safeScale;
    if (!Number.isFinite(scaled) || !Number.isFinite(view) || scaled <= view) return 0;
    return (scaled - view) / 2;
  };
  const axis = (value: number, max: number) =>
    max <= 0 || !Number.isFinite(value) ? 0 : Math.min(Math.max(value, -max), max);
  return {
    x: axis(pan.x, limit(content.width, viewport.width)),
    y: axis(pan.y, limit(content.height, viewport.height))
  };
}

/**
 * Zooms to `nextScale` around a focal point (e.g. the cursor or pinch
 * midpoint, relative to the stage center) so the content under that point
 * stays put, then re-clamps the pan. `view` is the current transform,
 * `content` the fitted image size at scale 1.
 */
export function zoomAtPoint(
  view: LightboxView,
  nextScale: number,
  point: LightboxPoint,
  content: LightboxSize,
  viewport: LightboxSize
): LightboxView {
  const current = clampZoom(view.scale);
  const scale = clampZoom(nextScale);
  const ratio = scale / current;
  const px = Number.isFinite(point.x) ? point.x : 0;
  const py = Number.isFinite(point.y) ? point.y : 0;
  const x = Number.isFinite(view.x) ? view.x : 0;
  const y = Number.isFinite(view.y) ? view.y : 0;
  const pan = clampPan(
    { x: px - (px - x) * ratio, y: py - (py - y) * ratio },
    scale,
    content,
    viewport
  );
  return { scale, x: pan.x, y: pan.y };
}

/** Locks a single-finger unzoomed drag onto the horizontal or vertical axis. */
export function resolveSwipeAxis(dx: number, dy: number, canHorizontal: boolean): 'x' | 'y' | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (!canHorizontal) return dy > 0 && absY >= absX ? 'y' : null;
  if (absY > absX * 1.15) return 'y';
  return 'x';
}

/** Whether a horizontal swipe moved far or fast enough to switch slides. */
export function shouldCommitHorizontalSwipe(
  dx: number,
  elapsedMs: number,
  stageWidth: number
): boolean {
  if (!Number.isFinite(dx) || !Number.isFinite(elapsedMs)) return false;
  const distance = Math.abs(dx);
  const width = Number.isFinite(stageWidth) && stageWidth > 0 ? stageWidth : 400;
  const threshold = Math.min(80, Math.max(40, width * 0.16));
  const velocity = distance / Math.max(1, elapsedMs);
  return distance >= threshold || (distance >= 24 && velocity >= 0.35);
}

/** Whether a downward swipe moved far or fast enough to dismiss the lightbox. */
export function shouldCommitDismissSwipe(
  dy: number,
  elapsedMs: number,
  stageHeight: number
): boolean {
  if (!Number.isFinite(dy) || !Number.isFinite(elapsedMs) || dy <= 0) return false;
  const height = Number.isFinite(stageHeight) && stageHeight > 0 ? stageHeight : 400;
  const threshold = Math.min(110, Math.max(72, height * 0.2));
  const velocity = dy / Math.max(1, elapsedMs);
  return dy >= threshold || (dy >= 40 && velocity >= 0.45);
}

/** Normalized `[0, 1]` progress for fading chrome and backdrop during swipe-down. */
export function dismissSwipeProgress(dy: number, stageHeight: number): number {
  if (!Number.isFinite(dy) || dy <= 0) return 0;
  const height = Number.isFinite(stageHeight) && stageHeight > 0 ? stageHeight : 400;
  const range = Math.min(height * 0.55, 320);
  return Math.min(1, dy / Math.max(1, range));
}
