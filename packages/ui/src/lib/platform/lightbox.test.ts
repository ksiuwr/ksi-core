/// <reference types="bun-types" />
import { describe, expect, test } from 'bun:test';
import {
  LIGHTBOX_DOUBLE_TAP_ZOOM,
  LIGHTBOX_MAX_ZOOM,
  LIGHTBOX_MIN_ZOOM,
  LIGHTBOX_ZOOM_STEP,
  clampPan,
  clampZoom,
  stepZoom,
  wrapLightboxIndex,
  zoomAtPoint
} from './lightbox.js';

describe('wrapLightboxIndex', () => {
  test('keeps in-range indices untouched', () => {
    expect(wrapLightboxIndex(0, 5)).toBe(0);
    expect(wrapLightboxIndex(2, 5)).toBe(2);
    expect(wrapLightboxIndex(4, 5)).toBe(4);
  });
  test('wraps forward past the end', () => {
    expect(wrapLightboxIndex(5, 5)).toBe(0);
    expect(wrapLightboxIndex(6, 5)).toBe(1);
    expect(wrapLightboxIndex(1234, 5)).toBe(4);
  });
  test('wraps backward before the start', () => {
    expect(wrapLightboxIndex(-1, 5)).toBe(4);
    expect(wrapLightboxIndex(-5, 5)).toBe(0);
    expect(wrapLightboxIndex(-6, 5)).toBe(4);
    expect(wrapLightboxIndex(-1234, 5)).toBe(1);
  });
  test('returns 0 for empty or invalid galleries', () => {
    expect(wrapLightboxIndex(3, 0)).toBe(0);
    expect(wrapLightboxIndex(-2, 0)).toBe(0);
    expect(wrapLightboxIndex(1, -3)).toBe(0);
    expect(wrapLightboxIndex(NaN, 5)).toBe(0);
    expect(wrapLightboxIndex(Infinity, 5)).toBe(0);
    expect(wrapLightboxIndex(1, NaN)).toBe(0);
  });
  test('single-item galleries always resolve to 0', () => {
    for (const index of [-100, -1, 0, 1, 100]) expect(wrapLightboxIndex(index, 1)).toBe(0);
  });
  test('truncates fractional indices toward zero', () => {
    expect(wrapLightboxIndex(2.9, 5)).toBe(2);
    expect(wrapLightboxIndex(-2.9, 5)).toBe(3);
  });
});

describe('clampZoom', () => {
  test('clamps to the default bounds', () => {
    expect(clampZoom(0.2)).toBe(LIGHTBOX_MIN_ZOOM);
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(2.5)).toBe(2.5);
    expect(clampZoom(4)).toBe(LIGHTBOX_MAX_ZOOM);
    expect(clampZoom(99)).toBe(LIGHTBOX_MAX_ZOOM);
  });
  test('guards non-finite scales', () => {
    expect(clampZoom(NaN)).toBe(LIGHTBOX_MIN_ZOOM);
    expect(clampZoom(Infinity)).toBe(LIGHTBOX_MIN_ZOOM);
    expect(clampZoom(-Infinity)).toBe(LIGHTBOX_MIN_ZOOM);
  });
  test('honours custom bounds and guards non-finite bounds', () => {
    expect(clampZoom(0.5, 0.5, 3)).toBe(0.5);
    expect(clampZoom(9, 0.5, 3)).toBe(3);
    expect(clampZoom(2, NaN, NaN)).toBe(2);
    expect(clampZoom(NaN, 0.5, 3)).toBe(0.5);
  });
});

describe('stepZoom', () => {
  test('steps up and down on the default grid', () => {
    expect(stepZoom(1, 1)).toBe(1.5);
    expect(stepZoom(1.5, 1)).toBe(2);
    expect(stepZoom(2, -1)).toBe(1.5);
    expect(stepZoom(2.5, -1)).toBe(2);
    expect(stepZoom(2.5, 1)).toBe(3);
  });
  test('saturates at the zoom bounds', () => {
    expect(stepZoom(LIGHTBOX_MAX_ZOOM, 1)).toBe(LIGHTBOX_MAX_ZOOM);
    expect(stepZoom(3.8, 1)).toBe(LIGHTBOX_MAX_ZOOM);
    expect(stepZoom(LIGHTBOX_MIN_ZOOM, -1)).toBe(LIGHTBOX_MIN_ZOOM);
    expect(stepZoom(1.2, -1)).toBe(LIGHTBOX_MIN_ZOOM);
  });
  test('repeated stepping lands on exact values without drift', () => {
    let scale = LIGHTBOX_MIN_ZOOM;
    for (let i = 0; i < 20; i++) scale = stepZoom(scale, 1);
    expect(scale).toBe(LIGHTBOX_MAX_ZOOM);
    for (let i = 0; i < 20; i++) scale = stepZoom(scale, -1);
    expect(scale).toBe(LIGHTBOX_MIN_ZOOM);
  });
  test('supports custom steps and guards invalid input', () => {
    expect(stepZoom(1, 1, 1)).toBe(2);
    expect(stepZoom(2, -1, 0.25)).toBe(1.75);
    expect(stepZoom(1, 1, 0)).toBe(1 + LIGHTBOX_ZOOM_STEP);
    expect(stepZoom(1, 1, NaN)).toBe(1 + LIGHTBOX_ZOOM_STEP);
    expect(stepZoom(NaN, 1)).toBe(1 + LIGHTBOX_ZOOM_STEP);
  });
  test('the double-tap zoom constant sits within the bounds', () => {
    expect(LIGHTBOX_DOUBLE_TAP_ZOOM).toBeGreaterThan(LIGHTBOX_MIN_ZOOM);
    expect(LIGHTBOX_DOUBLE_TAP_ZOOM).toBeLessThanOrEqual(LIGHTBOX_MAX_ZOOM);
    expect(clampZoom(LIGHTBOX_DOUBLE_TAP_ZOOM)).toBe(LIGHTBOX_DOUBLE_TAP_ZOOM);
  });
});

describe('clampPan', () => {
  const content = { width: 400, height: 300 };
  const viewport = { width: 400, height: 300 };

  test('pins pan to zero when unzoomed', () => {
    expect(clampPan({ x: 500, y: -500 }, 1, content, viewport)).toEqual({ x: 0, y: 0 });
    expect(clampPan({ x: 500, y: -500 }, 0.5, content, viewport)).toEqual({ x: 0, y: 0 });
    expect(clampPan({ x: 500, y: -500 }, NaN, content, viewport)).toEqual({ x: 0, y: 0 });
  });
  test('pins axes where the scaled content still fits', () => {
    // 200x150 scaled 2x = 400x300, exactly the viewport: nothing to pan.
    expect(clampPan({ x: 90, y: 90 }, 2, { width: 200, height: 150 }, viewport)).toEqual({
      x: 0,
      y: 0
    });
    // 300x100 scaled 2x = 600x200: only the x axis overflows.
    expect(clampPan({ x: 900, y: 900 }, 2, { width: 300, height: 100 }, viewport)).toEqual({
      x: 100,
      y: 0
    });
    // 100x200 scaled 2x = 200x400: only the y axis overflows.
    expect(clampPan({ x: -900, y: -900 }, 2, { width: 100, height: 200 }, viewport)).toEqual({
      x: 0,
      y: -50
    });
  });
  test('clamps to ±(scaled - viewport) / 2 when both axes overflow', () => {
    // 400x300 at 2x = 800x600 → limits ±200 / ±150.
    expect(clampPan({ x: 1000, y: 1000 }, 2, content, viewport)).toEqual({ x: 200, y: 150 });
    expect(clampPan({ x: -1000, y: -1000 }, 2, content, viewport)).toEqual({ x: -200, y: -150 });
    expect(clampPan({ x: 120, y: -80 }, 2, content, viewport)).toEqual({ x: 120, y: -80 });
    // At 4x the limits grow to ±600 / ±450.
    expect(clampPan({ x: 1000, y: -1000 }, 4, content, viewport)).toEqual({ x: 600, y: -450 });
  });
  test('every edge of the image remains reachable', () => {
    const limits = clampPan({ x: 1e9, y: 1e9 }, 3, content, viewport);
    // Panning to the limit puts the image edge exactly on the viewport edge.
    expect((content.width * 3) / 2 - limits.x).toBe(viewport.width / 2);
    expect((content.height * 3) / 2 - limits.y).toBe(viewport.height / 2);
  });
  test('guards non-finite pan values and sizes', () => {
    expect(clampPan({ x: NaN, y: Infinity }, 2, content, viewport)).toEqual({ x: 0, y: 0 });
    expect(clampPan({ x: 50, y: 50 }, 2, { width: NaN, height: 300 }, viewport)).toEqual({
      x: 0,
      y: 50
    });
    expect(clampPan({ x: 1000, y: 1000 }, 2, content, { width: 0, height: 0 })).toEqual({
      x: 400,
      y: 300
    });
  });
});

describe('zoomAtPoint', () => {
  const content = { width: 400, height: 300 };
  const viewport = { width: 400, height: 300 };
  const centered = { scale: 1, x: 0, y: 0 };

  test('zooming at the stage center keeps the image centered', () => {
    expect(zoomAtPoint(centered, 2, { x: 0, y: 0 }, content, viewport)).toEqual({
      scale: 2,
      x: 0,
      y: 0
    });
  });
  test('the content point under the cursor stays fixed', () => {
    const point = { x: 100, y: 50 };
    const next = zoomAtPoint(centered, 2, point, content, viewport);
    expect(next).toEqual({ scale: 2, x: -100, y: -50 });
    // Same content coordinate before and after: (point - pan) / scale.
    expect((point.x - next.x) / next.scale).toBe(point.x);
    expect((point.y - next.y) / next.scale).toBe(point.y);
  });
  test('focal zoom works from an already panned view', () => {
    const view = { scale: 2, x: -100, y: -50 };
    const point = { x: 100, y: 50 };
    const next = zoomAtPoint(view, 4, point, content, viewport);
    expect(next).toEqual({ scale: 4, x: -300, y: -150 });
    expect((point.x - next.x) / next.scale).toBe((point.x - view.x) / view.scale);
    expect((point.y - next.y) / next.scale).toBe((point.y - view.y) / view.scale);
  });
  test('clamps the resulting pan so the image never gets lost', () => {
    // Cursor at the exact viewport corner at 4x lands exactly on the limits.
    expect(zoomAtPoint(centered, 4, { x: 200, y: 150 }, content, viewport)).toEqual({
      scale: 4,
      x: -600,
      y: -450
    });
    // Beyond the corner the pan saturates at the same limits.
    expect(zoomAtPoint(centered, 4, { x: 250, y: 200 }, content, viewport)).toEqual({
      scale: 4,
      x: -600,
      y: -450
    });
  });
  test('zooming back to 1x recenters regardless of the focal point', () => {
    const view = { scale: 3, x: 400, y: -300 };
    expect(zoomAtPoint(view, 1, { x: 180, y: -120 }, content, viewport)).toEqual({
      scale: 1,
      x: 0,
      y: 0
    });
  });
  test('clamps the requested scale and guards non-finite input', () => {
    expect(zoomAtPoint(centered, 99, { x: 0, y: 0 }, content, viewport).scale).toBe(
      LIGHTBOX_MAX_ZOOM
    );
    expect(zoomAtPoint(centered, 0.1, { x: 0, y: 0 }, content, viewport).scale).toBe(
      LIGHTBOX_MIN_ZOOM
    );
    expect(zoomAtPoint(centered, NaN, { x: 100, y: 100 }, content, viewport)).toEqual({
      scale: 1,
      x: 0,
      y: 0
    });
    expect(
      zoomAtPoint({ scale: 2, x: NaN, y: NaN }, 2, { x: NaN, y: 50 }, content, viewport)
    ).toEqual({ scale: 2, x: 0, y: 0 });
  });
  test('an unchanged scale only re-clamps the existing pan', () => {
    const view = { scale: 2, x: 900, y: -900 };
    expect(zoomAtPoint(view, 2, { x: 30, y: 30 }, content, viewport)).toEqual({
      scale: 2,
      x: 200,
      y: -150
    });
  });
  test('double-tap zoom keeps the tapped point under the finger', () => {
    const point = { x: -120, y: 80 };
    const next = zoomAtPoint(centered, LIGHTBOX_DOUBLE_TAP_ZOOM, point, content, viewport);
    expect(next.scale).toBe(LIGHTBOX_DOUBLE_TAP_ZOOM);
    expect((point.x - next.x) / next.scale).toBeCloseTo(point.x, 10);
    expect((point.y - next.y) / next.scale).toBeCloseTo(point.y, 10);
  });
});
