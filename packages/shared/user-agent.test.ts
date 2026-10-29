import { expect, test } from 'bun:test';
import { summarizeUserAgent } from './user-agent';

const chromeMac =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const chromeWindows =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const chromeAndroid =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const chromeIos =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1';
const firefoxWindows =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0';
const firefoxLinux = 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0';
const safariMac =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const safariIos =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const safariIpad =
  'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const safariIpadDesktopMode =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const edgeWindows =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0';
const edgeAndroid =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 EdgA/126.0.0.0';
const edgeIos =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1 EdgiOS/126.0.0.0';

test.each([
  ['Chrome on macOS', chromeMac, { browser: 'Chrome', os: 'macOS' }],
  ['Chrome on Windows', chromeWindows, { browser: 'Chrome', os: 'Windows' }],
  ['Chrome on Android', chromeAndroid, { browser: 'Chrome', os: 'Android' }],
  ['Chrome on iOS', chromeIos, { browser: 'Chrome', os: 'iOS' }],
  ['Firefox on Windows', firefoxWindows, { browser: 'Firefox', os: 'Windows' }],
  ['Firefox on Linux', firefoxLinux, { browser: 'Firefox', os: 'Linux' }],
  ['Safari on macOS', safariMac, { browser: 'Safari', os: 'macOS' }],
  ['Safari on iOS', safariIos, { browser: 'Safari', os: 'iOS' }],
  ['Safari on iPadOS', safariIpad, { browser: 'Safari', os: 'iPadOS' }],
  ['Safari on iPadOS in desktop mode', safariIpadDesktopMode, { browser: 'Safari', os: 'iPadOS' }],
  ['Edge on Windows', edgeWindows, { browser: 'Edge', os: 'Windows' }],
  ['Edge on Android', edgeAndroid, { browser: 'Edge', os: 'Android' }],
  ['Edge on iOS', edgeIos, { browser: 'Edge', os: 'iOS' }]
])('summarizes %s', (_label, userAgent, expected) => {
  expect(summarizeUserAgent(userAgent)).toEqual(expected);
});

test.each([
  ['Bun runtime', 'Bun/1.3.14'],
  ['Node runtime', 'node'],
  ['curl', 'curl/8.5.0'],
  ['unknown agent', 'SomeClient/2.0'],
  ['empty', ''],
  ['null', null],
  ['undefined', undefined]
])('shows %s as an unknown client', (_label, userAgent) => {
  expect(summarizeUserAgent(userAgent)).toEqual({ browser: null, os: null });
});

test('does not mistake Chromium claims for Safari or Chrome', () => {
  expect(summarizeUserAgent(edgeWindows).browser).toBe('Edge');
  expect(summarizeUserAgent(safariMac).browser).toBe('Safari');
  expect(summarizeUserAgent(firefoxWindows).browser).toBe('Firefox');
});
