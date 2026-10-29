import { describe, expect, test } from 'bun:test';
import {
  MAX_UPLOAD_BYTES,
  mailFailure,
  mailRetryDelay,
  objectKey,
  referencedFileIds,
  sanitizeFilename,
  validateUpload
} from '../lib/storage';
import { createHash } from 'node:crypto';
const text = (value: string) => new TextEncoder().encode(value);
describe('file validation and names', () => {
  test('validates PDF and JSON by content rather than extension or browser MIME', () => {
    expect(
      validateUpload(text('%PDF-1.7\nexample\n%%EOF'), 'report.pdf', 'application/pdf').mime
    ).toBe('application/pdf');
    expect(validateUpload(text('{"hello":"world"}'), 'data.json', 'application/json').mime).toBe(
      'application/json'
    );
    expect(() => validateUpload(text('not a png'), 'image.png', 'image/png')).toThrow(
      'FILE_TYPE_UNSUPPORTED'
    );
    expect(() => validateUpload(text('not JSON'), 'data.json')).toThrow('FILE_CONTENT_INVALID');
    expect(() => validateUpload(text('%PDF-1.7\n%%EOF'), 'image.png', 'image/png')).toThrow(
      'FILE_TYPE_UNSUPPORTED'
    );
  });
  test('rejects executable, active content, unknown binary, and disguised script uploads', () => {
    for (const filename of ['evil.exe', 'evil.js.txt', 'evil.svg', 'archive.zip'])
      expect(() => validateUpload(text('harmless'), filename)).toThrow('FILE_TYPE_UNSUPPORTED');
    for (const content of ['#!/bin/bash\necho test', '<html>hello</html>', '\0binary'])
      expect(() => validateUpload(text(content), 'data.txt')).toThrow('FILE_TYPE_UNSUPPORTED');
    expect(() => validateUpload(new Uint8Array([127, 69, 76, 70]), 'report.pdf')).toThrow(
      'FILE_TYPE_UNSUPPORTED'
    );
  });
  test('enforces byte limits and sanitizes untrusted filenames', () => {
    expect(() => validateUpload(new Uint8Array(), 'a.txt')).toThrow('FILE_SIZE_INVALID');
    expect(() => validateUpload(new Uint8Array(MAX_UPLOAD_BYTES + 1), 'a.txt')).toThrow(
      'FILE_SIZE_INVALID'
    );
    expect(sanitizeFilename('../../unsafe\r\n".txt')).toBe('unsafe___.txt');
    expect(sanitizeFilename('C:\\path\\file.txt')).toBe('file.txt');
    expect(sanitizeFilename('...')).toBe('attachment');
  });
  test('content hashes are deterministic, object identities and environments remain isolated', () => {
    const bytes = text('hello');
    const { hash } = validateUpload(bytes, 'hello.txt');
    expect(hash).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(objectKey('preview-main-123', hash, 'one')).toStartWith(
      `preview-main-123/${hash.slice(0, 2)}/${hash}/`
    );
    expect(objectKey('production', hash, 'one')).not.toBe(objectKey('production', hash, 'two'));
    expect(() => objectKey('../production', hash)).toThrow('INVALID_OBJECT_KEY');
    expect(() => objectKey('production', 'unknown')).toThrow('INVALID_OBJECT_KEY');
  });
});
describe('reference discovery', () => {
  test('keeps distinct Markdown and gallery file identities', () => {
    expect(
      referencedFileIds(
        '![photo](/files/abcdefgh123/download) [gallery file:xyz987654321, file:abcdefgh123]'
      )
    ).toEqual(['abcdefgh123', 'xyz987654321']);
    expect(referencedFileIds('external https://example.com/photo.jpg')).toEqual([]);
    expect(referencedFileIds('/files/short/download')).toEqual([]);
  });
});
describe('mail retry policy', () => {
  test('backs off and caps delivery retries without negative delays', () => {
    expect(mailRetryDelay(1)).toBe(30_000);
    expect(mailRetryDelay(2)).toBe(60_000);
    expect(mailRetryDelay(50)).toBe(3_600_000);
    expect(mailRetryDelay(0)).toBe(30_000);
  });
  test('reports SMTP failure codes without error messages', () => {
    const rejected = Object.assign(new Error('535 Invalid API key for user@example.test'), {
      code: 'EAUTH',
      responseCode: 535
    });
    expect(mailFailure(rejected)).toEqual({ reason: 'EAUTH', smtpStatus: 535 });
    expect(mailFailure(Object.assign(new Error(), { code: 'SMTP_NOT_CONFIGURED' }))).toEqual({
      reason: 'SMTP_NOT_CONFIGURED'
    });
    expect(mailFailure(new Error('secret'))).toEqual({ reason: 'UNKNOWN' });
    expect(mailFailure({ code: 'user@example.test' })).toEqual({ reason: 'UNKNOWN' });
    expect(mailFailure(null)).toEqual({ reason: 'UNKNOWN' });
  });
});
