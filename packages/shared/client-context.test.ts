import { expect, test } from 'bun:test';
import {
  clientIp,
  clientIpHeader,
  clientUserAgent,
  clientUserAgentHeader,
  forwardClientContext,
  maxClientUserAgentLength,
  trustedClientHeaders
} from './client-context';

const browserUserAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

test('keeps a trimmed, bounded User-Agent', () => {
  expect(clientUserAgent(`  ${browserUserAgent}  `)).toBe(browserUserAgent);
  expect(clientUserAgent('   ')).toBeNull();
  expect(clientUserAgent(null)).toBeNull();
  expect(clientUserAgent('a'.repeat(maxClientUserAgentLength + 100))).toHaveLength(
    maxClientUserAgentLength
  );
});

test('accepts only a single valid IP address', () => {
  expect(clientIp('203.0.113.7')).toBe('203.0.113.7');
  expect(clientIp(' 2001:db8::1 ')).toBe('2001:db8::1');
  expect(clientIp('::ffff:192.0.2.1')).toBe('::ffff:192.0.2.1');
  for (const value of [
    '',
    'not-an-ip',
    '999.1.1.1',
    '203.0.113.7, 198.51.100.1',
    '203.0.113.7:8080',
    '1'.repeat(46),
    null
  ])
    expect(clientIp(value)).toBeNull();
});

test('forwarded client context replaces spoofed values', () => {
  const headers = new Headers({
    [clientUserAgentHeader]: 'spoofed agent',
    [clientIpHeader]: '10.0.0.1'
  });
  forwardClientContext(headers, { userAgent: browserUserAgent, ip: '203.0.113.7' });
  expect(headers.get(clientUserAgentHeader)).toBe(browserUserAgent);
  expect(headers.get(clientIpHeader)).toBe('203.0.113.7');
});

test('forwarded client context removes missing or invalid values', () => {
  const headers = new Headers({
    [clientUserAgentHeader]: 'spoofed agent',
    [clientIpHeader]: '10.0.0.1'
  });
  forwardClientContext(headers, { userAgent: null, ip: 'not-an-ip' });
  expect(headers.get(clientUserAgentHeader)).toBeNull();
  expect(headers.get(clientIpHeader)).toBeNull();
});

test('trusted headers use only verified forwarded details', () => {
  const trusted = trustedClientHeaders(
    new Headers({
      'content-type': 'application/json',
      cookie: 'ksi-session=abc',
      'user-agent': 'Bun/1.3.14',
      'x-forwarded-for': '10.0.0.1',
      [clientUserAgentHeader]: browserUserAgent,
      [clientIpHeader]: '203.0.113.7'
    })
  );
  expect(trusted.get('user-agent')).toBe(browserUserAgent);
  expect(trusted.get('x-forwarded-for')).toBe('203.0.113.7');
  expect(trusted.get(clientUserAgentHeader)).toBeNull();
  expect(trusted.get(clientIpHeader)).toBeNull();
  expect(trusted.get('content-type')).toBe('application/json');
  expect(trusted.get('cookie')).toBe('ksi-session=abc');
});

test('trusted headers never fall back to the proxy runtime or spoofed values', () => {
  const trusted = trustedClientHeaders(
    new Headers({
      'user-agent': 'Bun/1.3.14',
      'x-forwarded-for': '10.0.0.1',
      [clientIpHeader]: 'not-an-ip'
    })
  );
  expect(trusted.get('user-agent')).toBeNull();
  expect(trusted.get('x-forwarded-for')).toBeNull();
});

test('trusted headers cap the forwarded User-Agent', () => {
  const trusted = trustedClientHeaders(
    new Headers({ [clientUserAgentHeader]: 'a'.repeat(maxClientUserAgentLength + 100) })
  );
  expect(trusted.get('user-agent')).toHaveLength(maxClientUserAgentLength);
});
