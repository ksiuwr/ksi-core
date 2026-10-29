import { expect, test } from 'bun:test';
import {
  accessibleTextColor,
  contrastRatio,
  mixColors,
  parseHexColor,
  relativeLuminance,
  toHexColor,
  WCAG_AA_TEXT_CONTRAST
} from './color-contrast.ts';

test('hex colours parse as three or six digits and reject other formats', () => {
  expect(parseHexColor('#abc')).toEqual({ r: 170, g: 187, b: 204 });
  expect(parseHexColor('#AABBCC')).toEqual({ r: 170, g: 187, b: 204 });
  expect(parseHexColor('  #123456  ')).toEqual({ r: 18, g: 52, b: 86 });
  for (const invalid of ['#abcd', '#12345', '123456', 'red', 'rgb(0 0 0)', '', null, 42])
    expect(parseHexColor(invalid)).toBeNull();
});

test('colours format as lowercase six-digit hex and mix like CSS color-mix', () => {
  expect(toHexColor('#ABC')).toBe('#aabbcc');
  expect(toHexColor({ r: 255.6, g: -3, b: 15.2 })).toBe('#ff000f');
  expect(mixColors('#ffffff', '#000000', 0.5)).toEqual({ r: 127.5, g: 127.5, b: 127.5 });
  expect(toHexColor(mixColors('#ffffff', '#000000', 0.5))).toBe('#808080');
  expect(toHexColor(mixColors('#6b7280', '#ffffff', 0.14))).toBe('#eaebed');
});

test('relative luminance and contrast follow WCAG values', () => {
  expect(relativeLuminance('#000000')).toBe(0);
  expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 10);
  expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 10);
  expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
  expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.478, 3);
});

test('accessible text keeps readable colours and adjusts failing ones', () => {
  expect(accessibleTextColor('#000000', '#ffffff')).toBe('#000000');
  expect(accessibleTextColor('#111827', '#ffffff')).toBe('#111827');
  const lightText = accessibleTextColor('#ffff00', '#ffffff');
  expect(lightText).not.toBe('#ffff00');
  expect(contrastRatio(lightText, '#ffffff')).toBeGreaterThanOrEqual(WCAG_AA_TEXT_CONTRAST);
  const darkText = accessibleTextColor('#000000', '#16191c');
  expect(darkText).not.toBe('#000000');
  expect(contrastRatio(darkText, '#16191c')).toBeGreaterThanOrEqual(WCAG_AA_TEXT_CONTRAST);
});

test('accessible text satisfies every background at once', () => {
  const backgrounds = ['#ffffff', '#e9eaeb', '#d9dbdd', '#f2f2f3'];
  for (const color of ['#f59e0b', '#ffff00', '#2563eb', '#7c3aed', '#000000']) {
    const text = accessibleTextColor(color, backgrounds);
    for (const background of backgrounds)
      expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT_CONTRAST);
  }
});
